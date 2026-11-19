import { describe, it, expect } from "vitest";
import { createSheetsDb, SheetsDbError } from "./sheetsDb.js";

// In-memory stand-in for Supabase's REST API: honours on_conflict upserts and room_id/id equality filters.
function fakeSupabase() {
  const rows = new Map();
  const key = (roomId, id) => `${roomId}/${id}`;
  const eq = (params, column) => params.get(column)?.replace(/^eq\./, "");
  const fetch = async (url, { method = "GET", body } = {}) => {
    const { searchParams } = new URL(url);
    const respond = (data, status = 200) => ({ ok: status < 300, status, json: async () => data });
    if (method === "POST") {
      const row = JSON.parse(body);
      rows.set(key(row.room_id, row.id), row);
      return respond([row], 201);
    }
    const roomId = eq(searchParams, "room_id");
    if (method === "DELETE") {
      rows.delete(key(roomId, eq(searchParams, "id")));
      return respond([]);
    }
    return respond([...rows.values()].filter((r) => r.room_id === roomId).map(({ id, data }) => ({ id, data })));
  };
  return { fetch, rows };
}

const connect = (server, roomId) => createSheetsDb({ url: "https://x.supabase.co", anonKey: "anon", roomId, fetch: server.fetch });

describe("sheetsDb", () => {
  it("CA1 loads only the sheets of the current room", async () => {
    const server = fakeSupabase();
    await connect(server, "room-a").save("s1", { name: "Ana" });
    await connect(server, "room-b").save("s2", { name: "Bia" });

    expect(await connect(server, "room-a").load()).toEqual({ s1: { name: "Ana" } });
  });

  it("CA2 keeps same-id sheets of different rooms apart", async () => {
    const server = fakeSupabase();
    await connect(server, "room-a").save("same", { name: "Ana" });
    await connect(server, "room-b").save("same", { name: "Bia" });

    expect(await connect(server, "room-a").load()).toEqual({ same: { name: "Ana" } });
    expect(await connect(server, "room-b").load()).toEqual({ same: { name: "Bia" } });
  });

  it("CA3 saving one sheet touches only that row", async () => {
    const server = fakeSupabase();
    const db = connect(server, "room-a");
    await db.save("s1", { name: "Ana" });
    await db.save("s2", { name: "Bia" });
    await db.save("s1", { name: "Ana 2" });

    expect(await db.load()).toEqual({ s1: { name: "Ana 2" }, s2: { name: "Bia" } });
  });

  it("CA7 remove deletes only that room's sheet", async () => {
    const server = fakeSupabase();
    await connect(server, "room-a").save("same", { name: "Ana" });
    await connect(server, "room-b").save("same", { name: "Bia" });
    await connect(server, "room-a").remove("same");

    expect(await connect(server, "room-a").load()).toEqual({});
    expect(await connect(server, "room-b").load()).toEqual({ same: { name: "Bia" } });
  });

  describe("CA8/CA12 failures are surfaced, never swallowed", () => {
    const withFetch = (fetch) => createSheetsDb({ url: "https://x.supabase.co", anonKey: "anon", roomId: "r", fetch });
    const down = withFetch(async () => { throw new TypeError("Failed to fetch"); });
    const broken = withFetch(async () => ({ ok: false, status: 503, json: async () => ({}) }));

    for (const [name, db] of [["network down", down], ["HTTP 503", broken]]) {
      for (const op of ["load", "save", "remove"]) {
        it(`${op} rejects with SheetsDbError when ${name}`, async () => {
          await expect(db[op]("s1", {})).rejects.toBeInstanceOf(SheetsDbError);
        });
      }
    }
  });
});

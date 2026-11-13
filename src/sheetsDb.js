// Sheets live in Supabase, keyed by (room_id, id) so a room never sees another room's sheets.
// Talks to the REST API with fetch: no SDK needed for three operations.
export class SheetsDbError extends Error {
  constructor(message, status, options) {
    super(message, options);
    this.name = "SheetsDbError";
    this.status = status;
  }
}

export function createSheetsDb({ url, anonKey, roomId, fetch = globalThis.fetch }) {
  const endpoint = `${url}/rest/v1/sheets`;
  const room = `room_id=eq.${encodeURIComponent(roomId)}`;
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "x-room-id": roomId, "Content-Type": "application/json" };

  // Network errors and non-2xx answers both mean "database unavailable" to the caller.
  async function request(path, options) {
    let response;
    try {
      response = await fetch(`${endpoint}${path}`, { headers, ...options });
    } catch (cause) {
      throw new SheetsDbError("Database unreachable", undefined, { cause });
    }
    if (!response.ok) throw new SheetsDbError(`Database error ${response.status}`, response.status);
    return response;
  }

  return {
    async load() {
      const rows = await (await request(`?${room}&select=id,data`)).json();
      return Object.fromEntries(rows.map(({ id, data }) => [id, data]));
    },
    async save(id, data) {
      const body = JSON.stringify({ room_id: roomId, id, data });
      await request("?on_conflict=room_id,id", { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates" }, body });
    },
    async remove(id) {
      await request(`?${room}&id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  };
}

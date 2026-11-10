// Vue reactive proxies can't go through postMessage/structuredClone; data here is JSON-only.
export const toPlain = (value) => JSON.parse(JSON.stringify(value));

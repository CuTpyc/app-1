export async function parseJSONL(jsonlString) {
  return jsonlString
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
}

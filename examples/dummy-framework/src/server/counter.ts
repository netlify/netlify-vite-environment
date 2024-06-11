import type { Store } from "@netlify/blobs";

export async function getCount(blobs: Store) {
  const count = parseInt((await blobs.get("counter")) ?? "0");
  await blobs.set("counter", String(count + 1));
  return count;
}

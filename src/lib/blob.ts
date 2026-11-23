// Finds the Vercel Blob token. Vercel names it BLOB_READ_WRITE_TOKEN by default, but when a store is
// connected with a custom prefix it becomes e.g. WINS_PHOTOS_READ_WRITE_TOKEN, so accept any of those.
export function blobToken(): string | undefined {
  const env = process.env;
  if (env.BLOB_READ_WRITE_TOKEN) return env.BLOB_READ_WRITE_TOKEN;
  for (const [k, v] of Object.entries(env)) if (v && /READ_WRITE_TOKEN$/.test(k) && v.startsWith("vercel_blob_rw_")) return v;
  for (const v of Object.values(env)) if (v && v.startsWith("vercel_blob_rw_")) return v;
  return undefined;
}

export const NO_BLOB_MSG = "Photo uploads can't find your Vercel Blob key. In Vercel: Storage → your Blob store → Projects → make sure 'planner' is connected for Production, then Deployments → ⋯ on the latest → Redeploy.";

// Works out how to log in to Vercel Blob.
// - Older stores: a read-write token, BLOB_READ_WRITE_TOKEN (or <PREFIX>_READ_WRITE_TOKEN with a custom prefix).
// - Newer stores: no token at all, just BLOB_STORE_ID (or <PREFIX>_STORE_ID) plus Vercel's built-in OIDC login.
export type BlobAuth = { token: string } | { storeId: string };

export function blobAuth(): BlobAuth | null {
  const env = process.env;
  if (env.BLOB_READ_WRITE_TOKEN) return { token: env.BLOB_READ_WRITE_TOKEN };
  for (const [k, v] of Object.entries(env)) if (v && /READ_WRITE_TOKEN$/.test(k) && v.startsWith("vercel_blob_rw_")) return { token: v };
  if (env.BLOB_STORE_ID) return { storeId: env.BLOB_STORE_ID };
  for (const [k, v] of Object.entries(env)) if (v && /STORE_ID$/.test(k) && v.startsWith("store_")) return { storeId: v };
  return null;
}

/** Names (never values) of env vars that look Blob-related, to help spot a setup problem. */
const blobVarNames = () => Object.keys(process.env).filter((k) => /BLOB|STORE_ID/.test(k)).join(", ") || "none";

export const noBlobMsg = () =>
  `Photo uploads can't find your Vercel Blob store. In Vercel: Storage → your Blob store → Projects → make sure 'planner' is connected for Production, then Deployments → ⋯ on the latest → Redeploy. (Blob settings found: ${blobVarNames()})`;

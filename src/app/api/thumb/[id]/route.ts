import { driveFile, driveThumb } from "@/lib/google";

// Shows a Drive video's thumbnail (Drive thumbnails need the robot's login, so we fetch it here).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{10,}$/.test(id)) return new Response("bad id", { status: 400 });
  try {
    const f = await driveFile(id);
    if (!f.thumbnailLink) return new Response("no thumbnail", { status: 404 });
    const r = await driveThumb(f.thumbnailLink);
    if (!r.ok) return new Response("no thumbnail", { status: 404 });
    return new Response(r.body, { headers: { "Content-Type": r.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, max-age=86400" } });
  } catch { return new Response("error", { status: 404 }); }
}

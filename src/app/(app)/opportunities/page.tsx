import { redirect } from "next/navigation";

// Opportunities now lives inside the Updates tab. Old links and bookmarks land there.
export default async function OpportunitiesRedirect({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  redirect(type ? `/updates?view=opportunities&type=${encodeURIComponent(type)}` : "/updates?view=opportunities");
}

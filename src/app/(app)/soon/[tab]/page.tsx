import { TABS } from "@/lib/tabs";
import { PageHeader } from "@/components/ui";

const PLANS: Record<string, string[]> = {
  content: ["Posted vs scheduled posts for Life with C and Ane Manda", "Followers per account and growth charts", "What your followers like best", "The auto-posting tool will be its own project"],
  updates: ["Top 10 trending GitHub repos with short summaries", "5 new papers in XAI, Computer Vision and Neuroscience", "5 Medium articles from your topics (works with your membership)", "3 great YouTube videos to watch", "Refreshed automatically every morning"],
  weight: ["Weight trend chart and kg lost", "Friendly motivation", "Real recipes from the web for your gas cooker, rice cooker, sandwich maker and air fryer", "Tick off recipes you made and note how they turned out"],
  goals: ["Career, buy, travel and learn goals with pictures", "Added from a Google Sheet"],
  opportunities: ["New jobs, PhD and MSc positions", "Summer and winter schools and programs", "Filtered for XAI, Computer Vision, Neuroscience and Psychology", "Application deadlines go to your calendar"],
  habits: ["Sleep, water and gym streaks", "Daily check-ins from your phone"],
};

export default async function Soon({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const t = TABS.find((x) => x.href === `/soon/${tab}`);
  return (
    <div>
      <PageHeader title={`${t?.icon ?? ""} ${t?.label ?? "Coming soon"}`} subtitle="Coming in the next stage" />
      <div className="card p-6">
        <p className="mb-3">Here's what this tab will show:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">{(PLANS[tab] || []).map((p) => <li key={p}>{p}</li>)}</ul>
      </div>
    </div>
  );
}

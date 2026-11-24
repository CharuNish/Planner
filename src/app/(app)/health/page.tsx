import { redirect } from "next/navigation";

// Health now lives in the Glow Up tab.
export default function HealthPage() { redirect("/weight#health"); }

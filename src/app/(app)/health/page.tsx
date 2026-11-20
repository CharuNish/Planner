import { redirect } from "next/navigation";

// Health now lives in the Body & Health tab.
export default function HealthPage() { redirect("/weight#health"); }

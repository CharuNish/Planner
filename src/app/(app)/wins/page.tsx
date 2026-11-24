import { redirect } from "next/navigation";

// The Wins tab is now called Memories. Old links and bookmarks land there.
export default function WinsRedirect() { redirect("/memories"); }

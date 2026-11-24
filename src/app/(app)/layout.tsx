import { SwissBackground } from "@/components/swiss-background";
import { Nav } from "@/components/nav";
import { logout } from "../login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh relative isolate">
      <SwissBackground />
      <Nav />
      <div className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-28 md:pb-10">
          {children}
          <form action={logout} className="mt-10 text-center">
            <button className="text-xs muted underline">Log out</button>
          </form>
        </div>
      </div>
    </div>
  );
}

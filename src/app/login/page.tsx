"use client";
import { useActionState } from "react";
import { login } from "./actions";
import { Background3D } from "@/components/background3d";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <main className="min-h-dvh grid place-items-center px-4 relative isolate">
      <Background3D />
      <form action={action} className="card w-full max-w-sm p-8 space-y-5">
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-2xl grid place-items-center text-xl" style={{ background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", boxShadow: "0 0 30px rgba(139,92,246,.6)" }}>✦</div>
          <h1 className="text-xl font-semibold">Planner<span className="gradient-text">.OS</span></h1>
          <p className="text-sm muted">Welcome back! Enter your password.</p>
        </div>
        <input name="password" type="password" autoFocus required placeholder="Password" autoComplete="current-password"
          className="input w-full" />
        {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
        <button disabled={pending} className="btn w-full">{pending ? "Checking…" : "Log in"}</button>
      </form>
    </main>
  );
}

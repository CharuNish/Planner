"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <form action={action} className="card w-full max-w-sm p-8 space-y-5">
        <div className="text-center space-y-1">
          <div className="text-4xl">🌸</div>
          <h1 className="text-xl font-semibold">My Planner</h1>
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

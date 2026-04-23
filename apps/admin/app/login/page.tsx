"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@trapwear.dev");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      setPending(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center px-4 py-10 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(99,102,241,0.22),transparent)]"
      />
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300/90">TrapWear</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Admin sign in</h1>
          <p className="mt-2 text-sm text-slate-400">Secure access to operations and platform controls.</p>
        </div>
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-md">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none ring-indigo-500/0 transition placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

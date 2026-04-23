"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  variant?: "light" | "dark";
  className?: string;
};

export function LogoutButton({ variant = "light", className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const base =
    variant === "dark"
      ? "inline-flex items-center font-medium text-slate-300 hover:text-white disabled:opacity-50"
      : "font-medium text-trap-navy-900/70 hover:text-trap-navy-900 disabled:opacity-50";

  return (
    <button
      type="button"
      className={`${base} ${className}`.trim()}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}

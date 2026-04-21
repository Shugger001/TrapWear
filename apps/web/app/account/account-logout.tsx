"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm font-medium text-trap-navy-900/70 hover:text-trap-navy-900"
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

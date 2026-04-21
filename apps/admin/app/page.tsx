import { redirect } from "next/navigation";

export default function AdminHome() {
  const storefrontUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (storefrontUrl) {
    redirect(storefrontUrl);
  }
  // Fallback keeps admin reachable if NEXT_PUBLIC_SITE_URL is unset.
  redirect("/dashboard");
}

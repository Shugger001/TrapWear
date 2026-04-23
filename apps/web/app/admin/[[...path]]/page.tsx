import { redirect } from "next/navigation";

function joinAdminUrl(base: string, pathParts: string[] | undefined): string {
  const root = base.endsWith("/") ? base.slice(0, -1) : base;
  const path = (pathParts && pathParts.length > 0 ? pathParts : ["login"])
    .map(encodeURIComponent)
    .join("/");
  return path ? `${root}/${path}` : root;
}

export default async function AdminRedirectPage(props: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await props.params;
  const adminBase = process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || "http://localhost:3001";
  redirect(joinAdminUrl(adminBase, path));
}


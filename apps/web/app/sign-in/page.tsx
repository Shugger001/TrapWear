import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage(props: { searchParams: Promise<{ next?: string }> }) {
  const sp = await props.searchParams;
  const next = sp.next ?? "/account";
  const nextPath = next.startsWith("/") ? next : "/account";
  const signUpHref = `/sign-up?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16">
      <h1 className="text-2xl font-semibold text-trap-navy-900">Sign in</h1>
      <SignInForm nextPath={nextPath} signUpHref={signUpHref} />
      <p className="text-sm text-trap-navy-900/70">
        No account?{" "}
        <Link href={signUpHref} className="font-medium text-trap-sky-700 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

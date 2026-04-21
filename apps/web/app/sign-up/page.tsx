import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16">
      <h1 className="text-2xl font-semibold text-trap-navy-900">Create account</h1>
      <SignUpForm />
      <p className="text-sm text-trap-navy-900/70">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-trap-sky-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

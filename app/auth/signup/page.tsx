import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { safeReturnTo } from "@/lib/auth/return-to";

type SearchParams = { returnTo?: string };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { returnTo } = await searchParams;
  const safe = safeReturnTo(returnTo);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-(--text)">
          Create an account
        </h1>
        <p className="mt-1 text-sm text-(--muted)">
          Your data lives only on this server. No email is sent.
        </p>
      </div>

      <SignupForm returnTo={safe} />

      <p className="text-xs text-(--muted)">
        Already have an account?{" "}
        <Link
          href={`/auth/login?returnTo=${encodeURIComponent(safe)}`}
          className="font-medium text-(--accent) underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

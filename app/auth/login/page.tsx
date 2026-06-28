import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { safeReturnTo } from "@/lib/auth/return-to";

type SearchParams = { returnTo?: string };

export default async function LoginPage({
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
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-(--muted)">
          Sign in to your local-only Pocketbook account.
        </p>
      </div>

      <LoginForm returnTo={safe} />

      <p className="text-xs text-(--muted)">
        New here?{" "}
        <Link
          href={`/auth/signup?returnTo=${encodeURIComponent(safe)}`}
          className="font-medium text-(--accent) underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHead } from "@/components/wrt/shared/page";
import { safeReturnPath } from "@/lib/auth/redirect";

export function StaffAccessRequired({
  title,
  back,
  message,
  next,
}: {
  title: string;
  back: { href: Route; label: string };
  message: string;
  next: string;
}) {
  const signInHref = `/login?next=${encodeURIComponent(safeReturnPath(next))}` as Route;

  return (
    <>
      <PageHead title={title} back={back} />
      <Alert>
        <AlertTitle>Sign-in required</AlertTitle>
        <AlertDescription>
          {message} <Link href={signInHref} className="cn-link">Continue to sign in</Link>
        </AlertDescription>
      </Alert>
    </>
  );
}

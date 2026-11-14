import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/db/queries/auth";
import { safeReturnPath } from "@/lib/auth/redirect";
import { PageHead } from "@/components/wrt/shared/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff sign-in" };

export default async function LoginPage({ searchParams }: Readonly<PageProps<"/login">>) {
  const params = await searchParams;
  const next = safeReturnPath(typeof params.next === "string" ? params.next : "/");
  if (await isAuthenticated()) redirect(next as Route);

  return (
    <>
      <PageHead
        eyebrow="Staff access"
        title="Sign in"
        lead="Enter your approved email address and we’ll send you a one-time sign-in link."
      />
      {next !== "/" && (
        <Alert>
          <AlertTitle>Sign in to continue</AlertTitle>
          <AlertDescription>That page requires an approved WRT account, please sign in with an approved email to continue.</AlertDescription>
        </Alert>
      )}
      <LoginForm next={next} expired={params.error === "expired"} inactive={params.error === "not-approved"} />
    </>
  );
}

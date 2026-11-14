"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/inputs/form-field";
import { Spinner } from "@/components/ui/spinner";
import { INPUT_LIMITS } from "@/lib/forms/limits";
import { requestMagicLink, type LoginState } from "./actions";

const INITIAL: LoginState = { status: "idle", email: "", next: "/" };

export function LoginForm({ next, expired = false, inactive = false }: { next: string; expired?: boolean; inactive?: boolean }) {
  const [state, action, pending] = useActionState(requestMagicLink, { ...INITIAL, next });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.status !== "sent" || !state.requestedAt) return;
    const expiresAt = state.requestedAt + 60_000;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= expiresAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.requestedAt, state.status]);
  const remaining = state.requestedAt
    ? Math.max(0, Math.ceil((state.requestedAt + 60_000 - now) / 1000))
    : 0;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {expired && (
        <Alert>
          <AlertTitle>That sign-in link has expired or was already used</AlertTitle>
          <AlertDescription>Request a new link below.</AlertDescription>
        </Alert>
      )}
      {inactive && (
        <Alert>
          <AlertTitle>This email does not have active staff access</AlertTitle>
          <AlertDescription>Contact a WRT administrator if you think this is a mistake.</AlertDescription>
        </Alert>
      )}
      {state.status === "sent" && (
        <Alert role="status">
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>{state.message} Check your spam folder if it does not appear.</AlertDescription>
        </Alert>
      )}
      {state.status === "error" && state.message && (
        <Alert variant="destructive">
          <AlertTitle>Could not send a sign-in link</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="next" value={next} />
        <FormField label="Email" hint="Use the email address approved by the Whakatipu Reforestation Trust." error={state.fieldError}>
          {(control) => (
            <Input
              {...control}
              key={state.email}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={INPUT_LIMITS.shortText}
              defaultValue={state.email}
              placeholder="you@example.org"
            />
          )}
        </FormField>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending || remaining > 0}>
            {pending ? <><Spinner data-icon="inline-start" /> Sending link</> : state.status === "sent" ? "Resend sign-in link" : "Email me a sign-in link"}
          </Button>
          {remaining > 0 && <span className="text-sm text-muted-foreground">Resend in {remaining}s</span>}
        </div>
      </form>
      <p className="m-0 text-sm text-muted-foreground">
        <Link href="/" className="cn-link">Return to public planting records</Link>
      </p>
    </div>
  );
}

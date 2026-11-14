"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import { FormField } from "@/components/forms/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/wrt/shared/page";
import { INPUT_LIMITS } from "@/lib/forms/limits";
import {
  userSchema,
  type UserInput,
  type UserRecord,
  type UserSubmitResult,
} from "@/db/types";

export function UserForm({
  user,
  onSubmit,
  onDeactivate,
}: {
  user: UserRecord | undefined;
  onSubmit: (input: UserInput) => Promise<UserSubmitResult>;
  onDeactivate?:
    | ((
        previousState: UserSubmitResult,
        formData: FormData,
      ) => Promise<UserSubmitResult>)
    | undefined;
}) {
  const form = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "" },
  });
  const { isSubmitting, errors } = form.formState;

  async function handleSubmit(input: UserInput) {
    form.clearErrors("root");
    try {
      const result = await onSubmit(userSchema.parse(input));
      if (result.issues) {
        for (const issue of result.issues)
          form.setError(issue.path as FieldPath<UserInput>, {
            message: issue.message,
          });
        const first = result.issues[0];
        if (first)
          requestAnimationFrame(() =>
            form.setFocus(first.path as FieldPath<UserInput>),
          );
      } else if (result.error) form.setError("root", { message: result.error });
    } catch (error) {
      unstable_rethrow(error);
      form.setError("root", {
        message:
          "The user could not be saved. Your changes are still here. Please try again.",
      });
    }
  }

  return (
    <Card title={user ? `Edit ${user.name}` : "Add user"} className='!bg-transparent'>
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
        <FieldSet disabled={isSubmitting} aria-busy={isSubmitting}>
          <FieldGroup>
            <FormField
              control={form.control}
              name="name"
              label="Name"
              render={(field, accessibility) => (
                <Input
                  {...field}
                  {...accessibility}
                  maxLength={INPUT_LIMITS.shortText}
                  autoComplete="name"
                  required
                />
              )}
            />
            <FormField
              control={form.control}
              name="email"
              label="Email"
              render={(field, accessibility) => (
                <Input
                  {...field}
                  {...accessibility}
                  maxLength={INPUT_LIMITS.shortText}
                  type="email"
                  autoComplete="email"
                  required
                />
              )}
            />
            {errors.root && (
              <Alert variant="destructive">
                <AlertTitle>Unable to save</AlertTitle>
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {user ? "Save changes" : "Add user"}
              </Button>
              <Button asChild variant="secondary">
                <Link href="/users">Cancel</Link>
              </Button>
            </div>
          </FieldGroup>
        </FieldSet>
      </form>
      {user && onDeactivate && (
        <DeactivateUser name={user.name} onDeactivate={onDeactivate} />
      )}
    </Card>
  );
}

function DeactivateUser({
  name,
  onDeactivate,
}: {
  name: string;
  onDeactivate: (
    previousState: UserSubmitResult,
    formData: FormData,
  ) => Promise<UserSubmitResult>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [result, action, pending] = useActionState(onDeactivate, {});

  if (!confirming)
    return (
      <div className="mt-6 border-t pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirming(true)}
        >
          Deactivate user
        </Button>
      </div>
    );

  return (
    <form
      action={action}
      aria-label={`Deactivate ${name}`}
      aria-busy={pending}
      className="mt-6 border-t pt-4"
    >
      <Alert role="region" aria-label="Confirm user deactivation">
        <AlertTitle>Deactivate {name}?</AlertTitle>
        <AlertDescription>
          This removes their access. Their planting history and attribution will
          remain.
          {result.error && <p role="alert">{result.error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Deactivating…" : "Confirm deactivation"}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </form>
  );
}

"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
  const [confirmation, setConfirmation] = useState<UserInput | null>(null);
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
      setConfirmation(null);
    } catch (error) {
      unstable_rethrow(error);
      setConfirmation(null);
      form.setError("root", {
        message:
          "The user could not be saved. Your changes are still here. Please try again.",
      });
    }
  }

  return (
    <Card
      title={user ? `Edit ${user.name}` : "Add user"}
      className="!bg-transparent"
    >
      <form
        onSubmit={form.handleSubmit((input) => setConfirmation(input))}
        noValidate
      >
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
      {!user && (
        <AlertDialog
          open={confirmation !== null}
          onOpenChange={(open) => {
            if (!isSubmitting && !open) setConfirmation(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create user?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmation?.name} ({confirmation?.email}) will be able to
                sign in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>
                Cancel
              </AlertDialogCancel>
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  if (confirmation) void form.handleSubmit(handleSubmit)();
                }}
              >
                {isSubmitting && <Spinner data-icon="inline-start" />}
                Confirm creation
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {user && (
        <AlertDialog
          open={confirmation !== null}
          onOpenChange={(open) => {
            if (!isSubmitting && !open) setConfirmation(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Save changes to {user.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmation?.name} ({confirmation?.email}). Their updated
                details will be saved.
                {user.email !== confirmation?.email && (
                  <span> Changing the email resets their sign-in link.</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>
                Cancel
              </AlertDialogCancel>
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  if (confirmation) void form.handleSubmit(handleSubmit)();
                }}
              >
                {isSubmitting && <Spinner data-icon="inline-start" />}
                Confirm changes
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {user && onDeactivate && (
        <div className="mt-6 border-t pt-4">
          <UserStatusAction name={user.name} onAction={onDeactivate} />
        </div>
      )}
    </Card>
  );
}

export function UserStatusAction({
  name,
  reactivate = false,
  onAction,
}: {
  name: string;
  reactivate?: boolean;
  onAction: (
    previousState: UserSubmitResult,
    formData: FormData,
  ) => Promise<UserSubmitResult>;
}) {
  const [open, setOpen] = useState(false);
  const [result, action, pending] = useActionState(onAction, {});
  if (reactivate) {
    return (
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          Reactivate
        </Button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores their access to make changes into the system. Their
              planting history and attribution will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <form action={action}>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                Confirm reactivation
              </Button>
              {result.error && <p role="alert">{result.error}</p>}
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Deactivate user
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They will no longer be able to login and make changes to planting
            records and data within the system. Their planting history and
            attribution will remain.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <form action={action}>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Confirm deactivation
            </Button>
            {result.error && <p role="alert">{result.error}</p>}
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

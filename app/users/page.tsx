import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHead, Card, EmptyState } from "@/components/wrt/shared/page";
import { DataTable } from "@/components/wrt/shared/data-table";
import { UserForm } from "@/components/wrt/users/UserForm";
import { isAuthenticated, requireAuthenticated } from "@/db/queries/auth";
import {
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
} from "@/db/queries/users";
import { SUPABASE_TAG } from "@/db/cache";
import { userSchema, type UserInput, type UserSubmitResult } from "@/db/types";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: Readonly<PageProps<"/users">>) {
  await requireAuthenticated("/users");
  const params = await searchParams;
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const showNew = params.new === "1" && !editId;
  const users = await listUsers();
  const selected = editId
    ? users.find((user) => user.id === editId)
    : undefined;
  if (editId && (!selected || selected.deactivated_at)) notFound();
  const activeUsers = users.filter((user) => !user.deactivated_at);
  const deactivatedUsers = users.filter((user) => user.deactivated_at);

  async function onSubmit(input: UserInput): Promise<UserSubmitResult> {
    "use server";
    if (!(await isAuthenticated()))
      return { error: "Sign in to manage users." };
    const parsed = userSchema.safeParse(input);
    if (!parsed.success)
      return {
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join("."),
          message,
        })),
      };

    try {
      const { data, error } = selected
        ? await updateUser(selected.id, parsed.data)
        : await createUser(parsed.data);
      if (error?.code === "23505")
        return {
          issues: [{ path: "email", message: "This email is already in use." }],
        };
      if (error?.code === "42501")
        return { error: "Your account cannot manage users." };
      if (error || !data)
        return { error: "The user could not be saved. Please try again." };
    } catch {
      return { error: "The user could not be saved. Please try again." };
    }
    updateTag(SUPABASE_TAG);
    revalidatePath("/", "layout");
    redirect("/users?saved=1");
  }

  async function onDeactivate(): Promise<UserSubmitResult> {
    "use server";
    if (!(await isAuthenticated()))
      return { error: "Sign in to manage users." };
    if (!selected) return { error: "Choose a user to deactivate." };
    try {
      const { error } = await deactivateUser(selected.id);
      if (error?.code === "42501")
        return { error: "Your account cannot deactivate users." };
      if (error)
        return {
          error: "The user could not be deactivated. Please try again.",
        };
    } catch {
      return { error: "The user could not be deactivated. Please try again." };
    }
    updateTag(SUPABASE_TAG);
    revalidatePath("/", "layout");
    redirect("/users?saved=deactivated");
  }

  const saved = Array.isArray(params.saved) ? params.saved[0] : params.saved;
  return (
    <>
      <PageHead
        title="Users"
        lead="Manage who can sign in to the planting register."
        aside={
          <Button asChild>
            <Link href="/users?new=1">Add user</Link>
          </Button>
        }
      />
      {saved && (
        <Alert role="status">
          <AlertTitle>
            {saved === "deactivated" ? "User deactivated" : "User saved"}
          </AlertTitle>
          <AlertDescription>The change has been saved.</AlertDescription>
        </Alert>
      )}
      {(showNew || selected) && (
        <UserForm
          key={selected?.id ?? "new"}
          user={selected}
          onSubmit={onSubmit}
          onDeactivate={selected ? onDeactivate : undefined}
        />
      )}
      <Card title={`${activeUsers.length} active users`}>
        {activeUsers.length ? (
          <DataTable
            caption="Active users"
            rows={activeUsers}
            rowKey={(user) => user.id}
            minWidth={520}
            columns={[
              { key: "name", header: "Name", cell: (user) => user.name },
              { key: "email", header: "Email", cell: (user) => user.email },
              {
                key: "actions",
                header: "Actions",
                cell: (user) => (
                  <Link
                    className="cn-link whitespace-nowrap"
                    href={`/users?edit=${encodeURIComponent(user.id)}`}
                  >
                    Edit
                  </Link>
                ),
                nowrap: true,
              },
            ]}
          />
        ) : (
          <EmptyState title="No active users">
            Add a user to allow them to sign in.
          </EmptyState>
        )}
      </Card>
      {deactivatedUsers.length > 0 && (
        <Card title="Deactivated users">
          <details>
            <summary className="cursor-pointer">
              Show {deactivatedUsers.length} deactivated{" "}
              {deactivatedUsers.length === 1 ? "user" : "users"}
            </summary>
            <DataTable
              caption="Deactivated users"
              rows={deactivatedUsers}
              rowKey={(user) => user.id}
              minWidth={420}
              columns={[
                { key: "name", header: "Name", cell: (user) => user.name },
                { key: "email", header: "Email", cell: (user) => user.email },
              ]}
            />
          </details>
        </Card>
      )}
    </>
  );
}

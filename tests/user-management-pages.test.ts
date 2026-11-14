import { Children, isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserInput, UserRecord, UserSubmitResult } from "@/db/types";

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(), requireAuthenticated: vi.fn(), list: vi.fn(),
  create: vi.fn(), update: vi.fn(), deactivate: vi.fn(),
  tag: vi.fn(), revalidate: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/db/queries/auth", () => ({
  isAuthenticated: mocks.authenticated, requireAuthenticated: mocks.requireAuthenticated,
}));
vi.mock("@/db/queries/users", () => ({
  listUsers: mocks.list, createUser: mocks.create, updateUser: mocks.update, deactivateUser: mocks.deactivate,
}));
vi.mock("next/cache", () => ({ updateTag: mocks.tag, revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); },
}));
vi.mock("@/components/wrt/users/UserForm", () => ({ UserForm: () => null }));

import UsersPage from "@/app/users/page";
import { UserForm } from "@/components/wrt/users/UserForm";
import { SUPABASE_TAG } from "@/db/cache";

const user: UserRecord = { id: "user-id", name: "Alex", email: "alex@example.org", deactivated_at: null };
const values: UserInput = { name: "Alex", email: "alex@example.org" };
const page = (search: Record<string, string> = {}) => UsersPage({ params: Promise.resolve({}), searchParams: Promise.resolve(search) });
type EditorProps = {
  onSubmit: (input: UserInput) => Promise<UserSubmitResult>;
  onDeactivate: () => Promise<UserSubmitResult>;
};
function editor(result: Awaited<ReturnType<typeof page>>) {
  const form = Children.toArray(result.props.children).find(
    (child): child is ReactElement<EditorProps> => isValidElement(child) && child.type === UserForm,
  );
  if (!form) throw new Error("User form missing");
  return form.props;
}

describe("user-management actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.authenticated.mockResolvedValue(true);
    mocks.requireAuthenticated.mockResolvedValue(undefined);
    mocks.list.mockResolvedValue([user]);
    const saved = { data: { id: user.id }, error: null };
    mocks.create.mockResolvedValue(saved);
    mocks.update.mockResolvedValue(saved);
    mocks.deactivate.mockResolvedValue(saved);
    mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
  });

  it("requires access before loading private profiles", async () => {
    mocks.requireAuthenticated.mockRejectedValue(new Error("SIGN_IN"));
    await expect(page()).rejects.toThrow("SIGN_IN");
    expect(mocks.requireAuthenticated).toHaveBeenCalledWith("/users");
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("checks access again for both save and deactivation", async () => {
    const actions = editor(await page({ edit: user.id }));
    mocks.authenticated.mockResolvedValue(false);
    expect(await actions.onSubmit(values)).toEqual({ error: "Sign in to manage users." });
    expect(await actions.onDeactivate()).toEqual({ error: "Sign in to manage users." });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.deactivate).not.toHaveBeenCalled();
    expect(mocks.tag).not.toHaveBeenCalled();
  });

  it.each([{ users: [] }, { users: [{ ...user, deactivated_at: "2026-11-14T00:00:00Z" }] }])(
    "rejects missing or deactivated edit targets", async ({ users }) => {
      mocks.list.mockResolvedValue(users);
      await expect(page({ edit: user.id })).rejects.toThrow("NOT_FOUND");
    },
  );

  it("validates create submissions on the server before writing", async () => {
    const { onSubmit } = editor(await page({ new: "1" }));
    const result = await onSubmit({ name: " ", email: "invalid" });
    expect(result.issues?.map(({ path }) => path)).toEqual(["name", "email"]);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("normalizes new profiles and excludes supplied identity fields", async () => {
    const { onSubmit } = editor(await page({ new: "1" }));
    await expect(onSubmit({
      name: " Alex ", email: " ALEX@Example.org ",
      id: "forged-id", auth_user_id: "forged-auth-id", deactivated_at: "2026-11-14",
    } as UserInput)).rejects.toThrow("REDIRECT");
    expect(mocks.create).toHaveBeenCalledWith(values);
    expect(mocks.tag).toHaveBeenCalledWith(SUPABASE_TAG);
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith("/users?saved=1");
  });

  it("updates the captured target and invalidates only after saving", async () => {
    const { onSubmit } = editor(await page({ edit: user.id }));
    await expect(onSubmit({ ...values, name: "Updated" })).rejects.toThrow("REDIRECT");
    expect(mocks.update).toHaveBeenCalledWith(user.id, { ...values, name: "Updated" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.tag.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.update.mock.invocationCallOrder[0]!);
  });

  it("returns duplicate-email errors without invalidating or redirecting", async () => {
    mocks.update.mockResolvedValue({ data: null, error: { code: "23505" } });
    const { onSubmit } = editor(await page({ edit: user.id }));
    expect(await onSubmit(values)).toEqual({ issues: [{ path: "email", message: "This email is already in use." }] });
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("allows retrying deactivation after a failed write", async () => {
    const { onDeactivate } = editor(await page({ edit: user.id }));
    mocks.deactivate.mockRejectedValueOnce(new Error("network"));
    expect(await onDeactivate()).toEqual({ error: "The user could not be deactivated. Please try again." });
    expect(mocks.tag).not.toHaveBeenCalled();
    await expect(onDeactivate()).rejects.toThrow("REDIRECT");
    expect(mocks.deactivate).toHaveBeenLastCalledWith(user.id);
    expect(mocks.redirect).toHaveBeenCalledWith("/users?saved=deactivated");
  });
});

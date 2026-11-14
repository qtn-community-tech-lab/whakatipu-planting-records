import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserForm } from "@/components/wrt/users/UserForm";
import { userSchema } from "@/db/types";
import { INPUT_LIMITS, lengthMessage } from "@/lib/forms/limits";

describe("user management form", () => {
  afterEach(() => vi.restoreAllMocks());

  it("accepts shared text and email limits and rejects overlong values", () => {
    const email = "x".repeat(64) + "@" + ["a".repeat(63), "b".repeat(63), "c".repeat(62)].join(".");
    const input = { name: "n".repeat(INPUT_LIMITS.shortText), email };
    expect(userSchema.safeParse(input).success).toBe(true);

    for (const overlong of [
      { ...input, name: input.name + "n" },
      { ...input, email: email + "x" },
    ]) {
      const result = userSchema.safeParse(overlong);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toContainEqual(expect.objectContaining({ message: lengthMessage(INPUT_LIMITS.shortText) }));
    }
  });

  it("requires a name and valid email and normalizes the address", () => {
    expect(userSchema.safeParse({ name: "  ", email: "person@example.org" }).success).toBe(false);
    expect(userSchema.safeParse({ name: "Alex", email: "not an email" }).success).toBe(false);
    expect(userSchema.parse({ name: " Alex ", email: " ALEX@Example.org " })).toEqual({ name: "Alex", email: "alex@example.org" });
  });

  it("sets matching HTML limits on the form fields", () => {
    const html = renderToStaticMarkup(createElement(UserForm, {
      user: undefined,
      onSubmit: async () => ({}),
    }));
    const inputs = html.match(/<input\b[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(2);
    expect(inputs.every((input) => input.toLowerCase().includes(`maxlength="${INPUT_LIMITS.shortText}"`))).toBe(true);
    expect(html).toContain('type="email"');
  });
});

const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/db/client", () => ({ db: mocks.db }));

import { createUser, deactivateUser, listUsers, updateUser } from "@/db/queries/users";

describe("user queries", () => {
  afterEach(() => vi.clearAllMocks());

  it("lists users by name", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      throwOnError: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.db.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });

    await listUsers();

    expect(query.select).toHaveBeenCalledWith("id, name, email, deactivated_at");
    expect(query.order).toHaveBeenCalledWith("name");
  });

  it("creates and updates only the supplied user fields", async () => {
    const query = {
      insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "user-id" }, error: null }),
    };
    mocks.db.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
    const values = { name: "Alex", email: "alex@example.org" };

    await createUser(values);
    await updateUser("user-id", values);

    expect(query.insert).toHaveBeenCalledWith(values);
    expect(query.update).toHaveBeenCalledWith(values);
    expect(query.eq).toHaveBeenCalledWith("id", "user-id");
    expect(query.select).toHaveBeenCalledWith("id");
  });

  it("deactivates by setting the existing timestamp", async () => {
    const query = {
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "user-id" }, error: null }),
    };
    mocks.db.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });

    await deactivateUser("user-id");

    expect(query.update).toHaveBeenCalledWith({ deactivated_at: expect.any(String) });
    expect(query.eq).toHaveBeenCalledWith("id", "user-id");
  });
});

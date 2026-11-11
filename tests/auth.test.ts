import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMagicLink } = vi.hoisted(() => ({ sendMagicLink: vi.fn() }));
vi.mock("@/db/queries/auth", () => ({ sendMagicLink }));

const { requestMagicLink } = await import("@/app/login/actions");
const { loginEmailSchema } = await import("@/db/types");
const { safeReturnPath } = await import("@/lib/auth/redirect");

const form = (email: string, next = "/") => {
  const data = new FormData();
  data.set("email", email);
  data.set("next", next);
  return data;
};

describe("magic-link sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("accepts an email at the shared 255-character limit", () => {
    const email = "x".repeat(64) + "@" + ["a".repeat(63), "b".repeat(63), "c".repeat(62)].join(".");
    expect(email).toHaveLength(255);
    expect(loginEmailSchema.safeParse(email).success).toBe(true);
  });

  it("rejects invalid and overlong emails before contacting Supabase", async () => {
    const initial = { status: "idle" as const, email: "", next: "/" };
    const invalid = await requestMagicLink(initial, form("not-an-email"));
    expect(invalid.fieldError).toBe("Enter a valid email address.");

    const overlong = await requestMagicLink(initial, form("x".repeat(250) + "@a.com"));
    expect(overlong.fieldError).toBe("Use at most 255 characters.");
    expect(sendMagicLink).not.toHaveBeenCalled();
  });

  it("normalizes approved addresses and keeps return navigation internal", async () => {
    sendMagicLink.mockResolvedValue({ error: null });
    const result = await requestMagicLink(
      { status: "idle", email: "", next: "/" },
      form(" STAFF@EXAMPLE.ORG ", "/records?year=2025"),
    );

    expect(result.status).toBe("sent");
    expect(sendMagicLink).toHaveBeenCalledWith(
      "staff@example.org",
      "http://localhost:3000/auth/confirm?next=%2Frecords%3Fyear%3D2025",
    );
  });

  it("returns the same neutral response for an allowlist rejection", async () => {
    sendMagicLink.mockResolvedValue({ error: { status: 403 } });
    const result = await requestMagicLink(
      { status: "idle", email: "", next: "/" },
      form("visitor@example.org"),
    );
    expect(result.status).toBe("sent");
    expect(result.message).toContain("If this email is approved");
  });

  it("shows a retryable error for rate limits and delivery failures", async () => {
    sendMagicLink.mockResolvedValue({ error: { status: 429 } });
    const limited = await requestMagicLink(
      { status: "idle", email: "", next: "/" },
      form("staff@example.org"),
    );
    expect(limited.status).toBe("error");
    expect(limited.message).toContain("Please try again");

    sendMagicLink.mockRejectedValue(new Error("network"));
    const failed = await requestMagicLink(
      { status: "idle", email: "", next: "/" },
      form("staff@example.org"),
    );
    expect(failed.status).toBe("error");
    expect(failed.message).toContain("Please try again");
  });

  it.each(["https://example.com", "//example.com", "/\\example.com"])(
    "rejects an external return path: %s", (value) => {
      expect(safeReturnPath(value)).toBe("/");
    },
  );

  it("keeps a valid relative return path", () => {
    expect(safeReturnPath("/sites/lake-hayes?year=2025")).toBe("/sites/lake-hayes?year=2025");
  });
});

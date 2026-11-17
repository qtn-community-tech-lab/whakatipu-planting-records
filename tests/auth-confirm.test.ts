import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifyMagicLink: vi.fn(),
  signOut: vi.fn(),
  isAuthenticated: vi.fn(),
}));

vi.mock("@/db/queries/auth", () => ({
  verifyMagicLink: mocks.verifyMagicLink,
  signOut: mocks.signOut,
  isAuthenticated: mocks.isAuthenticated,
}));

const { GET } = await import("@/app/auth/confirm/route");
const request = (path: string) => new NextRequest("http://localhost:3000" + path);

describe("magic-link confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it("returns expired and reused links to login with the safe destination", async () => {
    mocks.verifyMagicLink.mockResolvedValue({ error: { code: "otp_expired" } });
    const response = await GET(request("/auth/confirm?token_hash=old&next=%2Frecords"));
    const location = new URL(response.headers.get("location")!, "http://localhost:3000");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("expired");
    expect(location.searchParams.get("next")).toBe("/records");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("shows an incomplete-link error when the token is missing", async () => {
    const response = await GET(request("/auth/confirm?next=%2Fsites"));
    expect(response.headers.get("location")).toBe("/login?error=invalid-link&next=%2Fsites");
    expect(mocks.verifyMagicLink).not.toHaveBeenCalled();
  });

  it("preserves a provider error without attempting to verify a missing token", async () => {
    const response = await GET(request("/auth/confirm?error=access_denied&error_code=otp_expired"));
    expect(response.headers.get("location")).toBe("/login?error=expired&next=%2F");
    expect(mocks.verifyMagicLink).not.toHaveBeenCalled();
  });

  it("does not describe a service failure as an expired link", async () => {
    mocks.verifyMagicLink.mockResolvedValue({ error: { code: "unexpected_failure" } });
    const response = await GET(request("/auth/confirm?token_hash=valid"));
    expect(response.headers.get("location")).toBe("/login?error=verification-failed&next=%2F");
    expect(mocks.isAuthenticated).not.toHaveBeenCalled();
  });

  it("returns a recovery message when verification throws", async () => {
    mocks.verifyMagicLink.mockRejectedValue(new Error("network"));
    const response = await GET(request("/auth/confirm?token_hash=valid"));
    expect(response.headers.get("location")).toBe("/login?error=verification-failed&next=%2F");
  });

  it("returns a recovery message when the staff-access check throws", async () => {
    mocks.verifyMagicLink.mockResolvedValue({ error: null });
    mocks.isAuthenticated.mockRejectedValue(new Error("database unavailable"));
    const response = await GET(request("/auth/confirm?token_hash=valid"));
    expect(response.headers.get("location")).toBe("/login?error=verification-failed&next=%2F");
  });

  it("rejects a verified identity without active approval", async () => {
    mocks.verifyMagicLink.mockResolvedValue({ error: null });
    mocks.isAuthenticated.mockResolvedValue(false);
    const response = await GET(request("/auth/confirm?token_hash=valid&next=%2Fask"));
    const location = new URL(response.headers.get("location")!, "http://localhost:3000");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("not-approved");
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("immediately redirects an active user to the internal destination", async () => {
    mocks.verifyMagicLink.mockResolvedValue({ error: null });
    mocks.isAuthenticated.mockResolvedValue(true);
    const response = await GET(request("/auth/confirm?token_hash=valid&next=%2Frecords%3Fyear%3D2025"));
    expect(response.headers.get("location")).toBe("/records?year=2025");
  });

  it.each(["http://127.0.0.1:3000", "http://localhost:3000"])(
    "keeps the session cookie host when signing in at %s", async (origin) => {
      mocks.verifyMagicLink.mockResolvedValue({ error: null });
      mocks.isAuthenticated.mockResolvedValue(true);
      const response = await GET(new NextRequest(`${origin}/auth/confirm?token_hash=valid`));
      const location = response.headers.get("location")!;
      expect(location).toBe("/");
      expect(new URL(location, origin).origin).toBe(origin);
    },
  );

  it("does not redirect to an external origin", async () => {
    mocks.verifyMagicLink.mockResolvedValue({ error: null });
    mocks.isAuthenticated.mockResolvedValue(true);
    const response = await GET(request("/auth/confirm?token_hash=valid&next=https%3A%2F%2Fevil.example"));
    expect(response.headers.get("location")).toBe("/");
  });
});

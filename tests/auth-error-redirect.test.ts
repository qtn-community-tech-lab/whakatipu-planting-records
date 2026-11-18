import { describe, expect, it } from "vitest";
import { authErrorRedirect } from "@/lib/auth/sign-in-errors";

const redirect = (path: string) => authErrorRedirect(new URL(path, "https://planting.example.org"));

describe("Auth error redirects", () => {
  it("recovers errors hidden in a fragment on Overview", () => {
    expect(redirect("/#error=access_denied&error_code=otp_expired&error_description=Email+link+has+expired"))
      .toBe("/login?error=expired&next=%2F");
  });

  it("handles errors in the query as well as the fragment", () => {
    expect(redirect("/?error=access_denied&error_code=otp_expired&next=%2Fsites"))
      .toBe("/login?error=expired&next=%2Fsites");
  });

  it("handles a fragment arriving on the login page", () => {
    expect(redirect("/login?error=invalid-link#error=access_denied&error_code=otp_expired"))
      .toBe("/login?error=expired&next=%2F");
  });

  it("shows a safe fallback without echoing provider descriptions or tokens", () => {
    expect(redirect("/#error=access_denied&error_description=private+details&access_token=secret&refresh_token=secret"))
      .toBe("/login?error=verification-failed&next=%2F");
  });

  it("rejects external return destinations", () => {
    expect(redirect("/?next=https%3A%2F%2Fother.example.org#error=access_denied&error_code=otp_expired"))
      .toBe("/login?error=expired&next=%2F");
  });

  it.each(["/", "/#main", "/sites?site=lake-hayes", "/login?error=expired&next=%2F", "/login?error=verification-failed"])(
    "does not redirect normal navigation or loop on the rendered error: %s", (path) => {
      expect(redirect(path)).toBeNull();
    },
  );
});

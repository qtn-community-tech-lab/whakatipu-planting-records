"use client";

import { useEffect } from "react";
import { authErrorRedirect } from "@/lib/auth/sign-in-errors";

/** Handle Auth failures that arrive on public pages, including URL fragments invisible to the server. */
export function AuthErrorRedirect() {
  useEffect(() => {
    const handleError = () => {
      const destination = authErrorRedirect(new URL(window.location.href));
      if (destination) window.location.replace(destination);
    };
    handleError();
    window.addEventListener("hashchange", handleError);
    return () => window.removeEventListener("hashchange", handleError);
  }, []);

  return null;
}

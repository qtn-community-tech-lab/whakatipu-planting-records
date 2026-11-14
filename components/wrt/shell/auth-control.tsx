"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logOut } from "@/app/auth/actions";

export function AuthControl({ authenticated }: { authenticated: boolean }) {
  if (!authenticated)
    return <Button asChild variant="soft" size="sm"><Link href="/login">Staff sign-in</Link></Button>;

  return (
    <form action={logOut}>
      <Button type="submit" variant="soft" size="sm">Sign out</Button>
    </form>
  );
}

"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/db/queries/auth";

export async function logOut() {
  await signOut();
  redirect("/login");
}

import { db } from "@/db/client";
import type { UserInput } from "@/db/types";

export async function listUsers() {
  const { data } = await (await db())
    .from("users")
    .select("id, name, email, deactivated_at")
    .order("name")
    .throwOnError();
  return data;
}

export async function createUser(values: UserInput) {
  return (await db())
    .from("users")
    .insert(values)
    .select("id")
    .single();
}

export async function updateUser(id: string, values: UserInput) {
  return (await db())
    .from("users")
    .update(values)
    .eq("id", id)
    .select("id")
    .single();
}

export async function deactivateUser(id: string) {
  return (await db())
    .from("users")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
}

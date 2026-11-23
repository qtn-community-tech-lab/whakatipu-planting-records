import { db } from "@/db/client";
import { currentUserId } from "./auth";
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
  const userId = await currentUserId();
  const timestamp = new Date().toISOString();
  return (await db())
    .from("users")
    .insert({ ...values, created_at: timestamp, created_by: userId, updated_at: timestamp, updated_by: userId })
    .select("id")
    .single();
}

export async function updateUser(id: string, values: UserInput) {
  const userId = await currentUserId();
  const timestamp = new Date().toISOString();
  return (await db())
    .from("users")
    .update({ ...values, updated_at: timestamp, updated_by: userId })
    .eq("id", id)
    .select("id")
    .single();
}

export async function deactivateUser(id: string) {
  const userId = await currentUserId();
  const timestamp = new Date().toISOString();
  return (await db())
    .from("users")
    .update({ deactivated_at: timestamp, deactivated_by: userId, updated_at: timestamp, updated_by: userId })
    .eq("id", id)
    .select("id")
    .single();
}

export async function reactivateUser(id: string) {
  const userId = await currentUserId();
  const timestamp = new Date().toISOString();
  return (await db())
    .from("users")
    .update({ deactivated_at: null, deactivated_by: null, updated_at: timestamp, updated_by: userId })
    .eq("id", id)
    .select("id")
    .single();
}

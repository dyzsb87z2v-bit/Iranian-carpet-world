import "server-only";
import { supabaseServer } from "./supabase/server";
import type { Role } from "./types";

export interface SessionInfo {
  userId: string;
  email: string | null;
  role: Role;
  seller: { id: string; status: string; shopName: string } | null;
}

export async function getSession(): Promise<SessionInfo | null> {
  const db = await supabaseServer();
  if (!db) return null;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: seller }] = await Promise.all([
    db.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    db.from("sellers").select("id, status, shop_name").eq("owner_id", user.id).maybeSingle(),
  ]);
  return {
    userId: user.id,
    email: user.email ?? null,
    role: (profile?.role as Role) ?? "buyer",
    seller: seller ? { id: seller.id, status: seller.status, shopName: seller.shop_name } : null,
  };
}

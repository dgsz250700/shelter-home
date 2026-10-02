import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { publicConfig } from "./config";

// Which student is using this device: a signed cookie holding the student's id.
// The PIN is checked on the server against a hash only the service role can read.
export const STUDENT_COOKIE = "refugio_student";
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export type StudentSummary = { id: string; name: string };

export function serviceDatabase() {
  const { url } = publicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta la clave del servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function cookieSecret() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta la clave del servidor.");
  return createHmac("sha256", key).update("refugio-student-cookie").digest();
}

export function signStudent(id: string) {
  return `${id}.${createHmac("sha256", cookieSecret()).update(id).digest("base64url")}`;
}

export function readStudentCookie(value: string | undefined): string | null {
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!id || !signature) return null;
  const expected = Buffer.from(signStudent(id).split(".")[1]);
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

export async function currentStudentId() {
  return readStudentCookie((await cookies()).get(STUDENT_COOKIE)?.value);
}

export async function listStudents(): Promise<StudentSummary[]> {
  const { data, error } = await serviceDatabase()
    .from("profiles")
    .select("id,display_name")
    .eq("role", "student")
    .order("created_at")
    .order("display_name");
  if (error) throw new Error("No pudimos cargar a los estudiantes.");
  return (data ?? []).map((p) => ({ id: String(p.id), name: String(p.display_name) }));
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("base64url");
  return `scrypt$${salt}$${scryptSync(pin, salt, 32).toString("base64url")}`;
}

function pinMatches(pin: string, stored: string) {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const given = scryptSync(pin, salt, expected.length);
  return timingSafeEqual(expected, given);
}

export type PinCheck = { ok: true } | { ok: false; reason: "wrong" | "locked" | "missing"; minutes?: number };

export async function checkPin(studentId: string, pin: string): Promise<PinCheck> {
  const db = serviceDatabase();
  const { data: access } = await db.from("student_access").select("*").eq("user_id", studentId).maybeSingle();
  if (!access) return { ok: false, reason: "missing" };
  const now = Date.now();
  if (access.locked_until && Date.parse(access.locked_until) > now)
    return { ok: false, reason: "locked", minutes: Math.ceil((Date.parse(access.locked_until) - now) / 60000) };
  if (/^\d{4}$/.test(pin) && pinMatches(pin, access.pin_hash)) {
    await db.from("student_access").update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }).eq("user_id", studentId);
    return { ok: true };
  }
  const failures = access.failed_attempts + 1;
  const locked = failures >= MAX_FAILURES;
  await db
    .from("student_access")
    .update({
      failed_attempts: locked ? 0 : failures,
      locked_until: locked ? new Date(now + LOCK_MINUTES * 60000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", studentId);
  return locked ? { ok: false, reason: "locked", minutes: LOCK_MINUTES } : { ok: false, reason: "wrong" };
}

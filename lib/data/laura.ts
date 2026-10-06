import "server-only";
import { studentClient } from "./student";
import type { ShelterCat, RewardStatus } from "./shelter";
export async function openLauraShelter(): Promise<ShelterCat[]> {
  const { db, userId } = await studentClient();
  const { data, error } = await db
    .from("cat_unlocks")
    .select("unlocked_at,adopted_at,care_count,admitted,arrival_streak,cats(id,slug,name,personality,story,palette,size,build,coat,tail,ears,pattern,accessories,trait_tags)")
    .eq("user_id", userId).eq("admitted",true);
  if (error) throw new Error("No pudimos cargar a los gatos.");
  // The streak each cat arrived on: the one saved with the cat, or else the consecutive days with the daily challenge passed, up to its arrival day.
  const passed = await db.from("sessions").select("date").eq("user_id", userId).eq("mode", "daily").eq("passed", true);
  const days = new Set((passed.data ?? []).map((s) => String(s.date)));
  const bogotaDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(iso));
  const streakOn = (day: string) => {
    let count = 0;
    for (const d = new Date(`${day}T12:00:00Z`); days.has(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() - 1)) count++;
    return count;
  };
  return (data ?? []).flatMap((row) => {
    const raw: unknown = row.cats;
    return (Array.isArray(raw) ? raw : [raw]).map((entry: unknown) => {
      if (!entry || typeof entry !== "object") throw new Error("Gato inválido");
      const c = entry as Record<string, unknown>;
      const p = c.palette as Record<string, unknown>;
      return {
        adoptedAt:row.adopted_at as string|null,
        careCount:Number(row.care_count??0),
        id: String(c.id),
        slug: String(c.slug),
        size: c.size as ShelterCat["size"],
        build: c.build as ShelterCat["build"],
        coat: c.coat as ShelterCat["coat"],
        tail: c.tail as ShelterCat["tail"],
        ears: c.ears as ShelterCat["ears"],
        pattern: String(c.pattern ?? ""),
        accessories: (c.accessories as string[] | null) ?? [],
        favorite: (c.trait_tags as string[] | null)?.[0],
        name: String(c.name),
        story: String(c.story),
        personality: String(c.personality),
        palette: { body: String(p.body), belly: String(p.belly) },
        unlockedAt: String(row.unlocked_at),
        arrivalStreak: Number(row.arrival_streak) || streakOn(bogotaDay(String(row.unlocked_at))) || undefined,
      };
    });
  }).sort((a,b)=>a.unlockedAt.localeCompare(b.unlockedAt));
}
export async function openRewardStatus(): Promise<RewardStatus> {
  const { db } = await studentClient();
  const { data, error } = await db.rpc("reward_status");
  if (error) throw new Error("No pudimos cargar el progreso del refugio.");
  return data as RewardStatus;
}

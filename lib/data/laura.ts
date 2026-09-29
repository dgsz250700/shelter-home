import "server-only";
import { studentClient } from "./student";
import type { ShelterCat, RewardStatus } from "./shelter";
export async function openLauraShelter(): Promise<ShelterCat[]> {
  const { db, userId } = await studentClient();
  const { data, error } = await db
    .from("cat_unlocks")
    .select("unlocked_at,adopted_at,care_count,admitted,cats(id,slug,name,personality,story,palette,art_variant,pattern,expressions,accessories)")
    .eq("user_id", userId).eq("admitted",true);
  if (error) throw new Error("No pudimos cargar a los gatos.");
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
        variant: Number(c.art_variant ?? 0),
        pattern: String(c.pattern ?? ""),
        expressions: (c.expressions as string[] | null) ?? [],
        accessories: (c.accessories as string[] | null) ?? [],
        name: String(c.name),
        story: String(c.story),
        personality: String(c.personality),
        palette: { body: String(p.body), belly: String(p.belly) },
        unlockedAt: String(row.unlocked_at),
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

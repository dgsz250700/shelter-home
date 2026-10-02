import 'server-only';
import {openLauraShelter,openRewardStatus} from './laura';
import type {CatBuild,CatCoat,CatEars,CatSize,CatTail} from '@/lib/engine/cat-look';
// Catalog data: traits and personality decide the drawing; progress only references ids.
export type ShelterCat={id:string;slug:string;name:string;personality:string;story:string;palette:{body:string;belly:string};size:CatSize;build:CatBuild;coat:CatCoat;tail:CatTail;ears:CatEars;pattern:string;accessories:string[];favorite?:string;unlockedAt:string;adoptedAt?:string|null;careCount?:number};
// Next streak milestone, computed by the database from the configurable reward rules.
export type RewardStatus={next:'arrival'|'adoption'|'waiting';needed:number;progressDays:number;capacity:number;residents:number;adopted:number};
export async function getShelter():Promise<ShelterCat[]>{return openLauraShelter()}
export async function getRewardStatus():Promise<RewardStatus>{return openRewardStatus()}

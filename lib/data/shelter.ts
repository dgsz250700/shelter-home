import 'server-only';
import {openLauraShelter,openRewardStatus} from './laura';
// Catalog data: visual assets belong to the cat; progress only references ids.
export type ShelterCat={id:string;slug:string;name:string;personality:string;story:string;palette:{body:string;belly:string};variant:number;pattern:string;expressions:string[];accessories:string[];unlockedAt:string;adoptedAt?:string|null;careCount?:number};
// Next streak milestone, computed by the database from the configurable reward rules.
export type RewardStatus={next:'arrival'|'adoption'|'waiting';needed:number;progressDays:number;capacity:number;residents:number;adopted:number};
export async function getShelter():Promise<ShelterCat[]>{return openLauraShelter()}
export async function getRewardStatus():Promise<RewardStatus>{return openRewardStatus()}

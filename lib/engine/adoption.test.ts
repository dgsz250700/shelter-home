import {describe,it,expect} from 'vitest';
import {careRecipient,nextCareReward,CARE_CYCLE} from './challenge';
describe('Care rules',()=>{
 it('includes every care reward once before repeating',()=>{expect(new Set(Array.from({length:7},(_,i)=>nextCareReward(i))).size).toBe(7);expect(nextCareReward(7)).toBe(CARE_CYCLE[0]);});
 it('favors personality among equally cared-for residents and excludes adopted cats',()=>{const cats=[{id:'a',personality:'dormilón',careCount:1},{id:'b',personality:'curioso',careCount:1},{id:'c',personality:'curioso',careCount:0,adoptedAt:'2026-09-10'}];expect(careRecipient(cats,'box')?.id).toBe('b');expect(careRecipient(cats,'bed')?.id).toBe('a');});
 it('prioritizes a cat who has received less care',()=>{expect(careRecipient([{id:'a',personality:'curioso',careCount:3},{id:'b',personality:'asustadizo',careCount:0}],'box')?.id).toBe('b');expect(careRecipient([],'food')).toBeUndefined();});
});

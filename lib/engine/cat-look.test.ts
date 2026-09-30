import {describe,expect,it} from 'vitest';
import {MOODS,PERSONALITIES,moodFor} from './cat-look';
describe('Cat personalities',()=>{
 it('gives every personality its own pose and expression',()=>{
  expect(new Set(PERSONALITIES.map(p=>MOODS[p].pose)).size).toBe(PERSONALITIES.length);
  expect(new Set(PERSONALITIES.map(p=>MOODS[p].expression)).size).toBe(PERSONALITIES.length);
 });
 it('keeps personality-driven details',()=>{
  expect(moodFor('dormilón')).toMatchObject({pose:'curl',expression:'sleepy'});
  expect(moodFor('asustadizo').ears).toBe('back');
  expect(moodFor('curioso').ears).toBe('forward');
 });
 it('falls back to a friendly cat for unknown personalities',()=>{expect(moodFor('desconocido')).toBe(MOODS.cariñoso);});
});

import {describe,it,expect} from 'vitest';
import {generate,evaluate} from './exercises';
const families=['equations','units','chemistry'] as const;
describe('generadores deterministas',()=>{for(const family of families)for(const level of [1,2,3,4] as const)it(`${family} nivel ${level}`,()=>{const seen=new Set<string>();for(let i=0;i<100;i++){const e=generate(family,'skill',level,`${family}-${level}-${i}`);expect(evaluate(e,e.answer)).toEqual({valid:true,correct:true,errorType:null});expect(e.errorSignatures.length).toBeGreaterThan(0);for(const s of e.errorSignatures){expect(s.value).not.toBe(e.answer);seen.add(s.value)} }expect(seen.size).toBeGreaterThan(1)})});

it('los despejes entrenan fórmulas sin sustituciones numéricas',()=>{for(let i=0;i<100;i++){const e=generate('equations','skill',3,`letters-${i}`);expect(e.answerFormat).toBe('expression');expect(e.formula).toBeTruthy();expect(e.target).toMatch(/^[A-Za-z]$/);expect(e.prompt).not.toMatch(/\d[.,]\d/);}});
import {looseText} from './exercises';
it('acepta respuestas escritas sin guiones ni comas',()=>{
 for(const a of ['re si','Re - Si','RE, SI','re-si','Re y Si','  ré   sí. '])expect(looseText(a)).toBe('re si');
 expect(looseText('Re Si Do')).not.toBe(looseText('Re Si'));
});

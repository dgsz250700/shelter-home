import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>undefined})}));
import {hashPin,readStudentCookie,signStudent} from './student-access';
beforeEach(()=>{vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-service-key');});
it('reconoce solo cookies firmadas por el servidor',()=>{
 const cookie=signStudent('student-a');
 expect(readStudentCookie(cookie)).toBe('student-a');
 expect(readStudentCookie(cookie.replace('student-a','student-b'))).toBeNull();
 expect(readStudentCookie('student-a.firma-falsa')).toBeNull();
 expect(readStudentCookie(undefined)).toBeNull();
});
it('la firma cambia si cambia la clave del servidor',()=>{
 const cookie=signStudent('student-a');
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','otra-clave');
 expect(readStudentCookie(cookie)).toBeNull();
});
it('guarda el PIN como hash con sal, nunca en claro',()=>{
 const a=hashPin('1234'),b=hashPin('1234');
 expect(a).not.toContain('1234');
 expect(a).not.toBe(b);
 expect(a).toMatch(/^scrypt\$[\w-]+\$[\w-]+$/);
});

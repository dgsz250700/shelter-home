import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('./tutor-auth',()=>({tutorDatabase:vi.fn()}));
vi.mock('./drive',()=>({driveBank:vi.fn()}));
vi.mock('./ai',()=>({reserveAI:vi.fn(),completeAI:vi.fn()}));
vi.mock('@/lib/ai/deepseek',()=>({deepseek:vi.fn()}));
import {tidyAnswer} from './drive-import';
it('quita la unidad de una respuesta numérica y pasa a texto lo que no es número',()=>{
 expect(tidyAnswer({answerFormat:'number',answer:'8 cm²'})).toMatchObject({answerFormat:'number',answer:'8'});
 expect(tidyAnswer({answerFormat:'number',answer:'2,5 m'})).toMatchObject({answer:'2,5'});
 expect(tidyAnswer({answerFormat:'fraction',answer:'3/4 de tiempo'})).toMatchObject({answer:'3/4'});
 expect(tidyAnswer({answerFormat:'number',answer:'Re - Si'})).toMatchObject({answerFormat:'text',answer:'Re - Si'});
 expect(tidyAnswer({answerFormat:'choice',answer:'B'})).toMatchObject({answerFormat:'choice',answer:'B'});
});

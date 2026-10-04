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
import {levelsFromText,sectionsByLevel} from './drive-import';
const sample=`Nivel 0 - Figuras\nPregunta 1 ¿Cuánto dura?\nPregunta 2 ¿Cuánto dura?\nNivel 1 - Compases\nPregunta 3 ¿Cuántos tiempos?\nNivel 0 - Figuras\nPregunta 4 repetida en otra página\nNivel 2 - Ritmos\nPregunta 5 Escribe\nSOLUCIONARIO\n01. Nivel 0 B\nPregunta 1 B`;
it('toma el nivel de cada pregunta de los encabezados del PDF',()=>{
 const levels=levelsFromText(sample);
 expect([...levels]).toEqual([[1,1],[2,1],[3,2],[4,1],[5,3]]);
});
it('separa el texto por nivel y añade el solucionario a cada parte',()=>{
 const parts=sectionsByLevel(sample);
 expect([...parts.keys()]).toEqual([1,2,3]);
 expect(parts.get(1)).toContain('Pregunta 4');expect(parts.get(1)).not.toContain('Pregunta 3');
 expect(parts.get(2)).toContain('SOLUCIONARIO');
});

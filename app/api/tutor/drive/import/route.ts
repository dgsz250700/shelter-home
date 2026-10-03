import {extractDriveQuestions,publishDriveQuestions} from '@/lib/data/drive-import';
export const maxDuration=180;
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origen inválido.'},{status:403});
 try{const text=await request.text();if(text.length>4000000)throw new Error('El banco es demasiado grande.');const body=JSON.parse(text);return Response.json(body.action==='publish'?await publishDriveQuestions(body):await extractDriveQuestions(body),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return Response.json({error:error instanceof Error?error.message:'No se pudo importar el banco.'},{status:400});}
}

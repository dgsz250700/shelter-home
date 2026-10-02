import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {publicConfig} from './config';
import {database} from './server';
import {studentClient} from './student';
import {cleanEvent,usageSummary,type UsageEvent} from '@/lib/engine/telemetry';
function store(){const {url}=publicConfig();const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('Tracking unavailable');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function ingestEvents(raw:unknown){
 if(!Array.isArray(raw)||raw.length>25)throw new Error('Invalid batch');
 const events=raw.map(e=>cleanEvent(e)).filter((e):e is UsageEvent=>e!==null);
 const db=store();const session=await database();const auth=await session.auth.getUser();
 const profile=auth.data.user ? await session.from('profiles').select('role').eq('id',auth.data.user.id).maybeSingle() : null;
 const tutor=profile?.data?.role==='tutor';
 const laura=events.some(e=>e.surface==='refuge')?await studentClient().catch(()=>null):null;
 const accepted=events.filter(e=>e.surface!=='tutor'||tutor);
 const rows=accepted.map(e=>({...e,actor_id:e.surface==='refuge'?laura?.userId??null:tutor?auth.data.user!.id:null,actor_kind:e.surface==='refuge'?'shared_refuge':tutor?'tutor':'visitor',is_test:process.env.NODE_ENV!=='production'||(e.surface==='refuge'&&tutor)}));
 // UUIDs from the client identify context, never authorize access. Discard unowned references.
 if(laura){const ids=[...new Set(rows.map(e=>e.session_id).filter(Boolean))];if(ids.length){const owned=await db.from('sessions').select('id').eq('user_id',laura.userId).in('id',ids);if(owned.error)throw new Error('Context unavailable');for(const r of rows)if(r.session_id&&!owned.data.some(s=>s.id===r.session_id))r.session_id=null;}}
 const skillIds=[...new Set(rows.map(e=>e.skill_id).filter(Boolean))];if(skillIds.length){const known=await db.from('skills').select('id').in('id',skillIds);if(known.error)throw new Error('Context unavailable');for(const r of rows)if(r.skill_id&&!known.data.some(s=>s.id===r.skill_id))r.skill_id=null;}
 if(rows.length){const saved=await db.from('app_events').upsert(rows,{onConflict:'id',ignoreDuplicates:true});if(saved.error)throw new Error('Events not saved');}
 // Detailed use events are retained for 90 days; academic attempts and memory are separate.
 const cleanup=await db.from('app_events').delete().lt('received_at',new Date(Date.now()-90*86400000).toISOString());
 if(cleanup.error)console.warn('telemetry_retention_pending');
 return {accepted:raw.flatMap(e=>e&&typeof e==='object'&&typeof e.id==='string'?[e.id]:[])};
}
export async function usageData(){
 try {
  const db=store();const events:UsageEvent[]=[];
  for(let start=0;start<5000;start+=1000){
   const result=await db.from('app_events').select('*').gte('occurred_at',new Date(Date.now()-14*86400000).toISOString()).order('occurred_at',{ascending:false}).order('id').range(start,start+999).abortSignal(AbortSignal.timeout(4000));
   if(result.error)return {events,available:events.length>0,truncated:true};
   events.push(...result.data as UsageEvent[]);if(result.data.length<1000)return {events,available:true,truncated:false};
  }
  return {events,available:true,truncated:true};
 }catch{return {events:[] as UsageEvent[],available:false,truncated:false};}
}
export async function behaviorEvidence(){const data=await usageData();return {available:data.available,windowDays:14,sampleLimited:data.truncated,source:'Uso del refugio compartido, no identidad individual verificada',...usageSummary(data.events)};}
export async function integrationHealth(){
 try{
  const result=await store().from('ai_requests').select('status,latency_ms,created_at').gte('created_at',new Date(Date.now()-7*86400000).toISOString()).order('created_at',{ascending:false}).limit(1000).abortSignal(AbortSignal.timeout(4000));
  if(result.error)return null;
  const rows=result.data;const measured=rows.flatMap(r=>typeof r.latency_ms==='number'?[r.latency_ms]:[]).sort((a,b)=>a-b);
  return {total:rows.length,completed:rows.filter(r=>r.status==='completed').length,failed:rows.filter(r=>r.status==='failed').length,pending:rows.filter(r=>r.status==='pending'&&Date.parse(r.created_at)>Date.now()-180000).length,unconfirmed:rows.filter(r=>r.status==='pending'&&Date.parse(r.created_at)<=Date.now()-180000).length,medianSeconds:measured.length?Math.round(measured[Math.floor(measured.length/2)]/1000):null,measured:measured.length,limited:rows.length===1000};
 }catch{return null;}
}

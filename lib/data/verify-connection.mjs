import {createClient} from '@supabase/supabase-js';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parseCredentials} from '../../scripts/setup-state.mjs';
const credentials=parseCredentials(await readFile('.env.credentials.json','utf8'),process.env.SUPABASE_PROJECT_REF);
assert.ok(credentials.length,'.env.credentials.json no corresponde a este proyecto Supabase.');
const clients={};const ids={};
for(const c of credentials){const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});const {data,error}=await db.auth.signInWithPassword({email:c.email,password:c.password});assert.equal(error,null);ids[c.role]=data.user.id;clients[c.role]=db;const profile=await db.from('profiles').select('role').eq('id',data.user.id).single();assert.equal(profile.data.role,c.role);console.log(`${c.role}: login y rol correctos`)}
const cats=await clients.student.from('cat_unlocks').select('cats(name)');assert.equal(cats.error,null);assert.ok(cats.data.some(row=>row.cats?.name==='Milo'));console.log('Milo visible y persistido');
const other=await clients.student.from('profiles').select('*').eq('id',ids.tutor);assert.deepEqual(other.data,[]);console.log('RLS: perfil del tutor invisible para estudiante');
const denied=await clients.student.from('shelter_state').insert({user_id:ids.tutor});assert.ok(denied.error);assert.equal(denied.error.code,'42501');console.log('RLS: escritura de otra cuenta rechazada por PostgreSQL');
const attempts=await clients.student.from('attempts').select('id').eq('user_id',ids.tutor);assert.deepEqual(attempts.data,[]);
const profiles=await clients.tutor.from('profiles').select('id');assert.equal(profiles.data.length,2);console.log('Tutor puede consultar los dos perfiles');

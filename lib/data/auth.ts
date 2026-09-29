'use server';
import {redirect} from 'next/navigation';
import {database} from './server';
export async function signIn(_previous:{error:string},form:FormData){const login=String(form.get('email')??'').trim();const email=login.toLowerCase()==='maracuya'?'tutor@refugio.test':login;const password=String(form.get('password')??'');if(!email||!password)return {error:'Escribe tu usuario y contraseña.'};const db=await database();const {error}=await db.auth.signInWithPassword({email,password});if(error)return {error:'No pudimos entrar. Revisa tu usuario y contraseña.'};redirect('/tutor')}
export async function signOut(){const db=await database();await db.auth.signOut();redirect('/auth')}

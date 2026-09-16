import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {normalizeFarm} from '../../../game/farm-state.js';
export const dynamic='force-dynamic';
const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
// Read-only bridge for farms saved before local-only storage was introduced.
// New gameplay and layouts are never posted to this endpoint.
export async function GET(){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in to recover your earlier farm.'},401);
 const db=env.DB;if(!db)return respond({error:'Your earlier farm is temporarily unavailable.'},503);
 try{const row=await db.prepare('SELECT state_json FROM farms WHERE user_id=?').bind(user.userId).first<{state_json:string}>();return respond({state:row?normalizeFarm(JSON.parse(row.state_json),Date.now()):null});}
 catch{return respond({error:'Your earlier farm is temporarily unavailable.'},503);}
}
export async function POST(){return respond({error:'Your farm now saves on this device. Reload once to move your earlier save.'},410);}

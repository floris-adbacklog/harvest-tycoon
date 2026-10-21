// The family shirt as this farmer's page last read it (21 Oct 2026, the owner: "Doe alles behalve 9", item 6): its cut and the family's
// emblem (the colour is the emblem's), for drawing the shirt on your farmer and in My farmer. Kept on this device after every Family
// read (the Family window, the village's family farmers), so drawing it needs no read of its own; only when nothing is kept for this
// family, or it is a day old, one Family read is made. A convenience: without storage it is simply read again.
export const FAMILY_SHIRT_KEY='harvest-tycoon:family-shirt',FAMILY_SHIRT_KEEP=24*3600000;
// After a Family read: what its view (the answer's family: view.family is the farmer's own family: id, shirt, emblem) says. A view
// without a shirt field (before supabase/family-shirt.sql) keeps no shirt.
export function keepFamilyShirt(view){
 const f=view?.family;if(!f?.id)return null;
 const kept={familyId:f.id,shirt:typeof f.shirt==='string'?f.shirt:null,emblem:String(f.emblem??'0'),at:Date.now()};
 try{localStorage.setItem(FAMILY_SHIRT_KEY,JSON.stringify(kept));}catch{}
 return kept;
}
export function keptFamilyShirt(familyId,now=Date.now()){
 try{const k=JSON.parse(localStorage.getItem(FAMILY_SHIRT_KEY)??'null');if(k&&k.familyId===familyId&&now-k.at<FAMILY_SHIRT_KEEP)return k;}catch{}
 return null;
}
// {shirt, emblem} of the family (shirt null: the family has none), or null when the farm is in no family or it cannot be read.
export async function familyShirt(familyId,bridge=globalThis.parent?.harvestBridge){
 if(!familyId)return null;
 const kept=keptFamilyShirt(familyId);if(kept)return {shirt:kept.shirt,emblem:kept.emblem};
 if(!bridge?.request)return null;
 try{const data=await bridge.request({operation:'family'});const k=keepFamilyShirt(data?.family);return k&&k.familyId===familyId?{shirt:k.shirt,emblem:k.emblem}:null;}catch{return null;}
}

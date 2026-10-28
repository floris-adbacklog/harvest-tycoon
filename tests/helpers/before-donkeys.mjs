// The rules from before the Donkey Stable (level 64, 27 Oct 2026) read every building of a save by name, so a save that holds the
// new building throws in them (farmSummary, dailyTasks). Its release goes site first: the new page is in every tab before farm-api
// writes a save with the stable, so the old rules never meet one. The differential tests of the releases before it still run the old
// rules on new saves; through beforeDonkeys they get the save as the old farm-api had it, without the stable.
const DONKEY=Object.freeze({buildings:['donkeystable'],inventory:['donkeymilk','donkeymilksoap','donkeycheese','bathbasket'],stats:['built_donkeystable','made_donkeymilk','made_donkeymilksoap','made_donkeycheese','made_bathbasket']});
const strip=value=>{
 if(value&&typeof value==='object'&&value.buildings&&typeof value.buildings==='object')for(const [part,keys] of Object.entries(DONKEY))if(value[part]&&typeof value[part]==='object')for(const key of keys)delete value[part][key];
 return value;
};
export function beforeDonkeys(rules){
 return new Proxy(rules,{get(target,key){const value=target[key];return typeof value==='function'?(...args)=>value(...args.map(strip)):value;}});
}
// What the new rules add to an old save beside a release's own change: the stable (unbuilt, level 1), its four goods and five counts.
export const withoutDonkeys=save=>strip(structuredClone(save));

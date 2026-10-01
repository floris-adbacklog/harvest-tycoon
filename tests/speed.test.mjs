import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 1 Oct 2026, "a harvest took over five seconds": farm-api ran in the region nearest the player while the database is in Frankfurt
// (1.2–1.7 s a tap in Asia). It now always runs next to the database; the query parameter needs no CORS change.
test('farm-api runs in Frankfurt, next to the database',()=>{
 const supabase=read('src/supabase.js');
 assert.match(supabase,/export const FARM_API='farm-api\?forceFunctionRegion=eu-central-1';/);
 assert.match(supabase,/supabase\.functions\.invoke\(FARM_API,\{body,timeout:20000\}\)/);
 assert.doesNotMatch(supabase,/invoke\('farm-api'/,'no call left that runs wherever the player is');
});

// Writes supabase/functions/farm-api/time-zones.js: which country each time zone belongs to, for the admin dashboard's "where players
// come from" (the device's own time zone, not the IP address). Reads the tz database's zone.tab, by default the one macOS ships:
//   node scripts/build-time-zones.mjs [path/to/zone.tab]
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const source=process.argv[2]??'/usr/share/zoneinfo/zone.tab';
const version=existsSync(new URL('file:///usr/share/zoneinfo/+VERSION'))&&!process.argv[2]?readFileSync('/usr/share/zoneinfo/+VERSION','utf8').trim():'unknown';
const zones={};
for(const line of readFileSync(source,'utf8').split('\n')){
 if(!line||line.startsWith('#'))continue;
 const [country,,zone]=line.split('\t');
 if(/^[A-Z]{2}$/.test(country)&&zone)zones[zone]=country;
}
// Older names that browsers (their ICU data) still report instead of the current ones, and zones merged into another since 2022.
const OLDER={'Asia/Calcutta':'IN','Asia/Katmandu':'NP','Asia/Saigon':'VN','Asia/Rangoon':'MM','Asia/Ulan_Bator':'MN','Asia/Choibalsan':'MN','Asia/Chongqing':'CN','Asia/Harbin':'CN','Asia/Tel_Aviv':'IL','Asia/Istanbul':'TR',
 'Europe/Kiev':'UA','Europe/Uzhgorod':'UA','Europe/Zaporozhye':'UA','Europe/Belfast':'GB','Europe/Nicosia':'CY','Atlantic/Faeroe':'FO',
 'America/Buenos_Aires':'AR','America/Catamarca':'AR','America/Cordoba':'AR','America/Jujuy':'AR','America/Mendoza':'AR','America/Indianapolis':'US','America/Louisville':'US','America/Fort_Wayne':'US',
 'America/Godthab':'GL','America/Montreal':'CA','America/Coral_Harbour':'CA','America/Nipigon':'CA','America/Thunder_Bay':'CA','America/Rainy_River':'CA','America/Yellowknife':'CA','America/Pangnirtung':'CA',
 'Pacific/Ponape':'FM','Pacific/Truk':'FM','Pacific/Enderbury':'KI','Australia/Currie':'AU'};
for(const [zone,country] of Object.entries(OLDER))zones[zone]??=country;
const sorted=Object.fromEntries(Object.entries(zones).sort(([a],[b])=>a.localeCompare(b)));
writeFileSync(new URL('../supabase/functions/farm-api/time-zones.js',import.meta.url),
`// Which country a time zone belongs to (Europe/Amsterdam → NL), for the admin dashboard's "where players come from": the device's own
// time zone, sent with every farm load, never the IP address. Made by scripts/build-time-zones.mjs from the tz database's zone.tab
// (${version}), plus the older names browsers still report (Asia/Calcutta, Europe/Kiev…). UTC and unknown zones give no country.
export const ZONE_COUNTRY=Object.freeze(${JSON.stringify(sorted)});
export const zoneCountry=zone=>typeof zone==='string'&&Object.hasOwn(ZONE_COUNTRY,zone)?ZONE_COUNTRY[zone]:null;
`);
console.log(`${Object.keys(sorted).length} time zones (${version})`);

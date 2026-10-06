import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
// The zip for itch.io (Oct 2026): one page (itch/index.html) that shows the live game from https://www.harvesttycoon.com in a frame.
// A push to the website updates the game itself; only a change in itch/ needs a new upload. Not part of the Vercel build: run
// `npm run build:itch` and upload dist-itch/harvest-tycoon-itch.zip on the itch.io project page (Kind of project: HTML).
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const GAME_URL='https://www.harvesttycoon.com/?src=itch';
export function buildItch({source=join(ROOT,'itch'),out=join(ROOT,'dist-itch')}={}){
 const page=join(source,'index.html');
 if(!readFileSync(page,'utf8').includes(`src="${GAME_URL}"`))throw new Error(`itch/index.html must show ${GAME_URL}`);
 const zip=join(out,'harvest-tycoon-itch.zip');
 mkdirSync(out,{recursive:true});rmSync(zip,{force:true});
 // index.html at the root of the zip, as itch.io asks.
 execFileSync('zip',['-X','-q','-j',zip,page]);
 if(!existsSync(zip))throw new Error('The zip was not made');
 return {zip};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {zip}=buildItch();
 console.log(`itch.io page ready: ${zip}. Upload it on the itch.io project page.`);
}

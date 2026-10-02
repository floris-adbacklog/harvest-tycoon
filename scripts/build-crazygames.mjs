import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
// The zip for CrazyGames (Oct 2026): our small page they host (crazygames/: index.html and wrapper.js), which shows the live game
// from https://www.harvesttycoon.com/crazygames.html in a frame. A push to the website updates the game itself; only a change in
// crazygames/ needs a new upload. Not part of the Vercel build: run `npm run build:crazygames` and upload
// dist-crazygames/harvest-tycoon-crazygames.zip in CrazyGames' developer portal. index.html sits at the root of the zip, as they ask.
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const SDK_TAG='<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>';
// CrazyGames serves the files from a folder of their own, so an address that starts with "/" would point at their site, not ours.
const ABSOLUTE=/(?:src|href)\s*=\s*["']\/(?!\/)|url\(\s*["']?\/(?!\/)|from\s*["']\/|import\(\s*["']\//;
export function checkWrapper(dir=join(ROOT,'crazygames')){
 const files=readdirSync(dir).filter(name=>!name.startsWith('.')).sort();
 if(!files.includes('index.html'))throw new Error('crazygames/index.html is missing');
 if(!readFileSync(join(dir,'index.html'),'utf8').includes(SDK_TAG))throw new Error('crazygames/index.html must load the CrazyGames SDK v3');
 for(const name of files){const text=readFileSync(join(dir,name),'utf8');if(ABSOLUTE.test(text))throw new Error(`crazygames/${name}: use relative paths only`);}
 return files;
}
export function buildCrazyGames({source=join(ROOT,'crazygames'),out=join(ROOT,'dist-crazygames')}={}){
 const files=checkWrapper(source),zip=join(out,'harvest-tycoon-crazygames.zip');
 mkdirSync(out,{recursive:true});rmSync(zip,{force:true});
 // The system's zip: the files themselves at the root, no folders, no extra file attributes.
 execFileSync('zip',['-X','-q','-j',zip,...files.map(name=>join(source,name))]);
 if(!existsSync(zip))throw new Error('The zip was not made');
 return {zip,files};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {zip,files}=buildCrazyGames();
 console.log(`CrazyGames wrapper ready: ${zip} (${files.join(', ')}). Upload it in the CrazyGames developer portal.`);
}

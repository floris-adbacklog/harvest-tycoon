import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

// Most tests read the game's source as text, so a stray bracket could pass them and still stop the farm from loading (26 Sep 2026).
test('every script of the game parses',()=>{
 const root=new URL('../',import.meta.url);
 for(const dir of ['public','src']){
  for(const file of readdirSync(new URL(`${dir}/`,root)).filter(f=>f.endsWith('.js'))){
   const path=new URL(`${dir}/${file}`,root).pathname,run=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
   assert.equal(run.status,0,`${dir}/${file}: ${run.stderr.split('\n').slice(0,4).join(' ')}`);
  }
 }
});

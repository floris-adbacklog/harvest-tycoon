import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('daily sharing shows what a Help or gift did, and why it was refused, in the middle of the screen over the window',()=>{
 const ui=read('public/social-ui.js');
 assert.match(ui,/import \{showCenterNotice\} from '\.\/center-notice\.js';/);
 assert.match(ui,/say\(sharingMessage\(r\.social,clean,/,'what it did');
 assert.match(ui,/catch\(e\)\{render\(\);say\(e\.message,true\);\}/,'a refusal, marked as one whatever its words');
 const notice=read('public/center-notice.js');
 assert.match(notice,/tone=refused\?'warn':parts\.tone/);
 assert.match(notice,/if\(tone!=='warn'\)timer=setTimeout\(close,duration\);/,'a refusal stays until it is tapped');
 assert.match(notice,/>Got it<\/button>/,'a button text every language already has');
 assert.match(read('public/retention.css'),/\.center-notice\{position:fixed;inset:0;[^}]*place-items:center/);
});

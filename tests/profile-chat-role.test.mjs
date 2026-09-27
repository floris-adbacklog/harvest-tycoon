import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// 27 Sep 2026: "l is not a function" on farmer profiles. The chat part of a profile (Send message, Report, Moderation) named its
// staff badge `role`, which hid role() (who you are) a few lines further on. Opened again within 30 seconds (or refreshed), the
// profile showed Try again; on a first open the chat buttons silently never appeared.
test('the chat part of a farmer profile never hides role() behind a variable of the same name',()=>{
 const chat=readFileSync(new URL('../src/chat-ui.js',import.meta.url),'utf8');
 const start=chat.indexOf('function decorateProfile('),body=chat.slice(start,chat.indexOf('\n }\n',start));
 assert.ok(start>0);
 assert.doesNotMatch(body,/\b(const|let|var)\s+role\b/,'no local role inside decorateProfile');
 assert.match(body,/admin=role\(\)==='admin'/);
 assert.match(body,/const badge=STAFF_LABELS\[status\.role\]\?status\.role:status\.moderator\?'moderator':null;/);
});

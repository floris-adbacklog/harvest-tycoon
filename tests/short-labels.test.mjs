import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// Translated languages hyphenate long words in running text (public/i18n-boot.js). The tools' words and the chat tabs are short labels:
// they never break (7 Oct 2026, "Plan-ten" and "Alge-meen" on a short screen in Dutch), and where a tool's picture sits beside its word
// the fixed 78px tool grows to fit it. Measured at 960x540 in all 16 languages: no word sticks out.
test('tool words and chat tabs never hyphenate; a short screen widens the tool to its word',()=>{
 assert.match(read('public/i18n-boot.js'),/body\{-webkit-hyphens:auto;hyphens:auto\}/);
 const css=read('public/retention.css');
 assert.match(css,/\.tool>span:not\(\.game-art\),\.chat-tabs button\{-webkit-hyphens:manual;hyphens:manual;white-space:nowrap\}/);
 assert.match(css,/@media\(min-width:721px\) and \(max-height:580px\)\{\.tool-dock \.tools \.tool\{width:auto;flex-shrink:0\}\}/);
 assert.ok(css.indexOf('width:auto;flex-shrink:0')>css.indexOf('.tool-dock .tools .tool{width:78px;'),'after the fixed width, so it wins');
});

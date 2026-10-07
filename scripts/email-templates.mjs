// Writes the two Supabase Auth email templates (sign-up confirmation and password reset) with the texts in every game language,
// plus their subject lines (29 Sep 2026; the subject is the same in every language). Supabase renders them with Go templates: the account's game language is
// .Data.language (user_metadata, saved by farm-api when the game loads and at sign-up); anything else is English.
// Run `node scripts/email-templates.mjs`, then paste each file and its subject into Supabase, Authentication, Emails.
// Only a small, safe part of Go templates is used: printf, eq, if / else if / end and variables, so a missing language never
// breaks a mail. tests/email-templates.test.mjs renders every language with a stand-in for exactly that part.
import {writeFileSync} from 'node:fs';
import {COPY,TAG,TEMPLATES,RTL} from '../supabase/functions/auth-email/texts.js';
export {TEMPLATES};
const FIELDS=['title','pre','intro','button','copy','foot','tag'];
const q=text=>{if(/["\\`{}]/.test(text))throw Error(`Not allowed in a template string: ${text}`);return `"${text}"`;};
// The language code and each text as Go template variables: English first, then one block that overrides them per language.
function variables(texts){
 const all=code=>({...texts[code],copy:COPY[code],tag:TAG[code]});
 const set=(code,op)=>FIELDS.map(f=>`{{- $${f} ${op} ${q(all(code)[f])} -}}`).join('\n');
 const others=Object.keys(texts).filter(code=>code!=='en');
 return `{{- $l := printf "%v" .Data.language -}}\n{{- $lang := "en" -}}\n{{- $dir := "ltr" -}}\n${set('en',':=')}\n`
  +others.map((code,i)=>`{{- ${i?'else if':'if'} eq $l "${code}" -}}\n{{- $lang = "${code}" -}}\n${RTL.includes(code)?'{{- $dir = "rtl" -}}\n':''}${set(code,'=')}\n`).join('')+'{{- end -}}\n';
}
// The subject is the same in every language: Supabase allows at most 255 characters there, too few for 14 languages. The inbox
// shows the preview line ($pre) beside it, and that one is in the farmer's language.
export const SUBJECTS=Object.freeze({'confirm-signup':'🌱 Harvest Tycoon','reset-password':'🔑 Harvest Tycoon'});
export function templateHtml(texts){
 return `${variables(texts)}<!doctype html>
<html lang="{{ $lang }}" dir="{{ $dir }}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{ $title }}</title></head>
<body style="margin:0;padding:0;background:#f3e8e0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3e8e0;">{{ $pre }}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8e0;padding:28px 12px;">
 <tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffdf6;border-radius:22px;border:1px solid #eadfd4;">
   <tr><td align="center" style="padding:28px 28px 0;">
    <img src="https://www.harvesttycoon.com/assets/harvest-tycoon-logo.png" width="150" height="150" alt="Harvest Tycoon" style="display:block;border:0;width:150px;height:auto;">
   </td></tr>
   <tr><td style="padding:8px 32px 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#3d3923;">
    <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#3d3923;">{{ $title }}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#5d573f;">{{ $intro }}</p>
   </td></tr>
   <tr><td align="center" style="padding:0 32px 8px;">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#685e3f;color:#fffdf0;text-decoration:none;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;padding:15px 30px;border-radius:12px;border-bottom:3px solid #494125;">{{ $button }}</a>
   </td></tr>
   <tr><td style="padding:22px 32px 30px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#857d70;">
    <p style="margin:0 0 10px;">{{ $copy }}<br><a href="{{ .ConfirmationURL }}" style="color:#5b5336;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
    <p style="margin:0;">{{ $foot }}</p>
   </td></tr>
  </table>
  <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8e8374;margin:16px 0 0;">Harvest Tycoon<br>{{ $tag }}</p>
 </td></tr>
</table>
</body></html>
`;
}
if(import.meta.url===`file://${process.argv[1]}`){
 let subjects='Subjects for Supabase, Authentication, Emails (paste each line into the Subject field of its template):\n\n';
 for(const [name,texts] of Object.entries(TEMPLATES)){
  writeFileSync(new URL(`../supabase/email-templates/${name}.html`,import.meta.url),templateHtml(texts));
  subjects+=`${name}:\n${SUBJECTS[name]}\n\n`;
 }
 writeFileSync(new URL('../supabase/email-templates/subjects.txt',import.meta.url),subjects);
 console.log('Wrote supabase/email-templates: confirm-signup.html, reset-password.html, subjects.txt');
}

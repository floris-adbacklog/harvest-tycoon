// The sign-up confirmation and password reset emails for the Send Email Hook (index.ts): the same layout and texts as the Supabase
// templates (scripts/email-templates.mjs), with a subject in the farmer's own language (30 Sep 2026).
import {COPY,TAG,TEMPLATES,SUBJECTS,SUBJECT_ICONS,RTL} from './texts.js';

// Which email each of Supabase's actions sends. The game only asks Supabase for these two (sign-up, and its resend; forgot your
// password); a changed email address is confirmed by farm-api with its own code.
export const MAIL_OF=Object.freeze({signup:'confirm-signup',recovery:'reset-password'});
export const LANGUAGES=Object.freeze(Object.keys(TEMPLATES['confirm-signup']));
export const languageOf=value=>LANGUAGES.includes(String(value??''))?String(value):'en';

const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Supabase's own confirmation link: /auth/v1/verify checks the token and sends the farmer on to redirect_to (play.html).
export function confirmationUrl({supabaseUrl,tokenHash,type,redirectTo}){
 const url=new URL('/auth/v1/verify',supabaseUrl);
 url.searchParams.set('token',tokenHash);url.searchParams.set('type',type);if(redirectTo)url.searchParams.set('redirect_to',redirectTo);
 return url.href;
}

export function authEmail({type,language,link}){
 const name=MAIL_OF[type];if(!name)throw Error(`No email for the ${type} action.`);
 const lang=languageOf(language),t={...TEMPLATES[name][lang],copy:COPY[lang],tag:TAG[lang]},href=esc(link),font="'DM Sans',Helvetica,Arial,sans-serif";
 const subject=`${SUBJECT_ICONS[name]} ${SUBJECTS[name][lang]}`;
 const html=`<!doctype html>
<html lang="${lang}" dir="${RTL.includes(lang)?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.title)}</title></head>
<body style="margin:0;padding:0;background:#f3e8e0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3e8e0;">${esc(t.pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8e0;padding:28px 12px;">
 <tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffdf6;border-radius:22px;border:1px solid #eadfd4;">
   <tr><td align="center" style="padding:28px 28px 0;">
    <img src="https://www.harvesttycoon.com/assets/harvest-tycoon-logo.png" width="150" height="150" alt="Harvest Tycoon" style="display:block;border:0;width:150px;height:auto;">
   </td></tr>
   <tr><td style="padding:8px 32px 0;font-family:${font};color:#3d3923;">
    <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#3d3923;">${esc(t.title)}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#5d573f;">${esc(t.intro)}</p>
   </td></tr>
   <tr><td align="center" style="padding:0 32px 8px;">
    <a href="${href}" style="display:inline-block;background:#685e3f;color:#fffdf0;text-decoration:none;font-family:${font};font-size:16px;font-weight:700;padding:15px 30px;border-radius:12px;border-bottom:3px solid #494125;">${esc(t.button)}</a>
   </td></tr>
   <tr><td style="padding:22px 32px 30px;font-family:${font};font-size:13px;line-height:1.6;color:#857d70;">
    <p style="margin:0 0 10px;">${esc(t.copy)}<br><a href="${href}" style="color:#5b5336;word-break:break-all;">${href}</a></p>
    <p style="margin:0;">${esc(t.foot)}</p>
   </td></tr>
  </table>
  <p style="font-family:${font};font-size:12px;color:#8e8374;margin:16px 0 0;">Harvest Tycoon &middot; ${esc(t.tag)}</p>
 </td></tr>
</table>
</body></html>
`;
 const text=`${t.title}\n\n${t.intro}\n\n${t.button}: ${link}\n\n${t.foot}\n\nHarvest Tycoon · ${t.tag}\n`;
 return {subject,html,text,language:lang};
}

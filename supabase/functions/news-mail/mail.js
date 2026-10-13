// One news and offers email (13 Oct 2026): plain and readable, in the game's palette like the daily summary (notify-hourly/mail.js)
// and the sign-up mails: the logo, the admin's subject as the heading, their text, at most one button to our own website, and under
// it why the farmer gets it with a link that stops only news and offers, in the farmer's own language (texts.js). Every part the admin
// wrote is escaped: their text can never add markup or a link. A plain-text part carries the same.
import {newsTexts,RTL_MAIL} from './texts.js';
import {MAIL_LANGUAGES,OWN_PAGE} from './rules.js';

const esc=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dirOf=language=>RTL_MAIL.includes(language)?'rtl':'ltr';
const FONT="'DM Sans',Helvetica,Arial,sans-serif";

// notify-hourly's unsubscribe page (only=news, 13 Oct 2026): opening it changes nothing, its button or a mail app's one-click request
// turns news and offers off and leaves the daily summary on; the page is in the farmer's language.
export const unsubscribeLink=(functionsUrl,token,language)=>`${functionsUrl}/notify-hourly?unsubscribe=${encodeURIComponent(String(token??''))}&only=news&lang=${MAIL_LANGUAGES.includes(language)?language:'en'}`;

// The admin's text for one game language: that language's own parts, English for a part left empty (as News and pop-ups do).
export function textFor(texts,language){
 const en=texts?.en??{},own=(language!=='en'&&texts?.[language])||{};
 return {subject:own.subject||en.subject||'',body:own.body||en.body||'',buttonLabel:own.buttonLabel||en.buttonLabel||'',language:own.body?language:'en'};
}
// Paragraphs at an empty line; a single line break stays a line break.
export const paragraphs=body=>String(body??'').split(/\n[ \t]*\n/).map(p=>p.trim()).filter(Boolean);

export function newsEmail({texts,language,buttonUrl=null,unsubscribeUrl,appUrl='https://www.harvesttycoon.com',test=false}){
 const lang=MAIL_LANGUAGES.includes(language)?language:'en',t=newsTexts(lang),a=textFor(texts,lang);
 // The button only with its text and one of our own pages (rules.js checked it already; checked again here, as it goes in a link).
 const button=a.buttonLabel&&buttonUrl&&OWN_PAGE.test(buttonUrl)?{label:a.buttonLabel,href:buttonUrl}:null;
 const subject=`${test?'[Test] ':''}${a.subject}`.replace(/[\r\n]+/g,' ');
 const html=`<!doctype html><html lang="${lang}" dir="${dirOf(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3e8e0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8e0;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf6;border-radius:22px;border:1px solid #eadfd4;">
<tr><td align="center" style="padding:24px 28px 0;"><img src="${esc(appUrl)}/assets/harvest-tycoon-logo.png" width="130" height="130" alt="Harvest Tycoon" style="display:block;border:0;width:130px;height:auto;"></td></tr>
<tr><td lang="${a.language}" dir="${dirOf(a.language)}" style="padding:8px 32px 6px;font-family:${FONT};color:#3d3923;">
<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#3d3923;">${esc(a.subject)}</h1>
${paragraphs(a.body).map(p=>`<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#5d573f;">${esc(p).replace(/\n/g,'<br>')}</p>`).join('\n')}</td></tr>
${button?`<tr><td align="center" lang="${a.language}" dir="${dirOf(a.language)}" style="padding:6px 32px 8px;"><a href="${esc(button.href)}" style="display:inline-block;background:#685e3f;color:#fffdf0;text-decoration:none;font-family:${FONT};font-size:16px;font-weight:700;padding:15px 30px;border-radius:12px;border-bottom:3px solid #494125;">${esc(button.label)}</a></td></tr>\n`:''}<tr><td style="padding:22px 32px 28px;font-family:${FONT};font-size:12px;line-height:1.6;color:#857d70;">${esc(t.why)} <a href="${esc(unsubscribeUrl)}" style="color:#5b5336;">${esc(t.unsubscribe)}</a></td></tr>
</table></td></tr></table></body></html>`;
 const text=`${a.subject}\n\n${paragraphs(a.body).join('\n\n')}\n\n${button?`${button.label}: ${button.href}\n\n`:''}--\n${t.why}\n${t.unsubscribe}: ${unsubscribeUrl}\n`;
 // One-click unsubscribe (RFC 8058), as Gmail and Yahoo ask of bulk senders: the mail app posts to the same link.
 const headers={'List-Unsubscribe':`<${unsubscribeUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'};
 return {subject,html,text,headers,language:lang};
}

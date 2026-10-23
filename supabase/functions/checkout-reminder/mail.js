// The one reminder email (23 Oct 2026, option 5), in the look of the news and offers email (news-mail/mail.js): the logo, the pack as
// the heading, one short text, the Google Play line, one button back to the game, and under it why the farmer gets it with the link
// that stops only news and offers (notify-hourly's ?only=news, as the news email). A plain-text part carries the same.
import {reminderTexts,packNameIn,RTL_MAIL,REMINDER_LANGUAGES} from './texts.js';

const esc=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FONT="'DM Sans',Helvetica,Arial,sans-serif";
export const unsubscribeLink=(functionsUrl,token,language)=>`${functionsUrl}/notify-hourly?unsubscribe=${encodeURIComponent(String(token??''))}&only=news&lang=${REMINDER_LANGUAGES.includes(language)?language:'en'}`;
// Back to the game: the home page opens the farm for a signed-in farmer; source=email counts the open as the email's (public/app-links.js
// reminderSource), and the campaign says which email it was.
export const gameLink=appUrl=>`${appUrl}/?source=email&utm_source=checkout_reminder&utm_medium=email&utm_campaign=checkout`;

export function reminderEmail({language,pack,diamonds,unsubscribeUrl,appUrl='https://www.harvesttycoon.com'}){
 const t=reminderTexts(language),dir=RTL_MAIL.includes(t.language)?'rtl':'ltr',name=packNameIn(t.language,pack,diamonds),href=gameLink(appUrl);
 const subject=t.subject;
 const html=`<!doctype html><html lang="${t.language}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3e8e0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8e0;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf6;border-radius:22px;border:1px solid #eadfd4;">
<tr><td align="center" style="padding:24px 28px 0;"><img src="${esc(appUrl)}/assets/harvest-tycoon-logo.png" width="130" height="130" alt="Harvest Tycoon" style="display:block;border:0;width:130px;height:auto;"></td></tr>
<tr><td style="padding:8px 32px 6px;font-family:${FONT};color:#3d3923;">
<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#3d3923;">${esc(name)}</h1>
<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#5d573f;">${esc(t.body)}</p>
<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#7a705f;">${esc(t.android)}</p></td></tr>
<tr><td align="center" style="padding:6px 32px 8px;"><a href="${esc(href)}" style="display:inline-block;background:#685e3f;color:#fffdf0;text-decoration:none;font-family:${FONT};font-size:16px;font-weight:700;padding:15px 30px;border-radius:12px;border-bottom:3px solid #494125;">${esc(t.button)}</a></td></tr>
<tr><td style="padding:22px 32px 28px;font-family:${FONT};font-size:12px;line-height:1.6;color:#857d70;">${esc(t.why)} <a href="${esc(unsubscribeUrl)}" style="color:#5b5336;">${esc(t.unsubscribe)}</a></td></tr>
</table></td></tr></table></body></html>`;
 const text=`${name}\n\n${t.body}\n\n${t.android}\n\n${t.button}: ${href}\n\n--\n${t.why}\n${t.unsubscribe}: ${unsubscribeUrl}\n`;
 // One-click unsubscribe (RFC 8058), as the news email.
 const headers={'List-Unsubscribe':`<${unsubscribeUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'};
 return {subject,html,text,headers,language:t.language};
}

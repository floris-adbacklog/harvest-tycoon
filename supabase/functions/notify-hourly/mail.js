// The daily email summary. Plain, small and branded like the sign-up mails; every mail carries its own unsubscribe link.
// Written in the farmer's game language (digest.language, texts.js), English when it is not known.
import {cropsText,jobsText,localNames,CONFIG} from './rules.js';
import {textsFor,RTL_MAIL} from './texts.js';
const escape=text=>String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

export function digestLines(digest,names={crops:{},buildings:{}}){
 const t=textsFor(digest.language),local=localNames(names,t.language),lines=[];
 if(digest.crops?.length)lines.push(cropsText(digest.crops,local.crops,CONFIG.MAX_KINDS,t));
 if(digest.jobs?.length)lines.push(jobsText(digest.jobs,local.buildings,t));
 // After 3 days or more away the comeback chest takes the gift's line (Oct 2026), like the morning push.
 if(digest.giftWaiting||digest.comeback)lines.push(digest.comeback?t.comeback:digest.streak>=2?t.giftStreak(digest.streak):t.gift);
 return lines;
}
export function digestSubject(digest){
 const t=textsFor(digest.language);
 if(digest.crops?.length)return t.subjectCrops(digest.crops.length);
 if(digest.jobs?.length)return t.subjectJobs(digest.jobs.length);
 return digest.comeback?t.comeback:t.gift;
}
export function digestEmail({digest,names,appUrl,unsubscribeUrl}){
 const t=textsFor(digest.language),lines=digestLines(digest,names);
 const items=lines.map(line=>`<li style="margin:0 0 8px;">${escape(line)}</li>`).join('');
 const html=`<!doctype html><html lang="${t.language}" dir="${RTL_MAIL.includes(t.language)?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(digestSubject(digest))}</title></head>
<body style="margin:0;padding:0;background:#f3e8e0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8e0;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffdf6;border-radius:22px;border:1px solid #eadfd4;">
<tr><td align="center" style="padding:24px 28px 0;"><img src="${appUrl}/assets/harvest-tycoon-logo.png" width="130" height="130" alt="Harvest Tycoon" style="display:block;border:0;width:130px;height:auto;"></td></tr>
<tr><td style="padding:8px 32px 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#3d3923;">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#3d3923;">${escape(t.hi(digest.username??'farmer'))}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#5d573f;">${escape(t.waiting)}</p>
<ul style="margin:0 0 24px;padding-left:20px;font-size:16px;line-height:1.6;color:#3d3923;">${items}</ul></td></tr>
<tr><td align="center" style="padding:0 32px 8px;"><a href="${appUrl}/?source=email" style="display:inline-block;background:#685e3f;color:#fffdf0;text-decoration:none;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;padding:15px 30px;border-radius:12px;border-bottom:3px solid #494125;">${escape(t.button)}</a></td></tr>
<tr><td style="padding:22px 32px 28px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#857d70;">${escape(t.footer)} <a href="${unsubscribeUrl}" style="color:#5b5336;">${escape(t.unsubscribe)}</a></td></tr>
</table></td></tr></table></body></html>`;
 const text=`${t.hi(digest.username??'farmer')}\n\n${t.waiting}\n${lines.map(l=>`- ${l}`).join('\n')}\n\n${t.openText}: ${appUrl}/?source=email\n\n${t.footerShort} ${t.unsubscribe}: ${unsubscribeUrl}\n`;
 return {subject:digestSubject(digest),html,text};
}

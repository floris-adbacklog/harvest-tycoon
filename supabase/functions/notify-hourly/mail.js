// The daily email summary. Plain, small and branded like the sign-up mails; every mail carries its own unsubscribe link.
import {cropsText,jobsText} from './rules.js';
const escape=text=>String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

export function digestLines(digest,names={crops:{},buildings:{}}){
 const lines=[];
 if(digest.crops?.length)lines.push(cropsText(digest.crops,names.crops));
 if(digest.jobs?.length)lines.push(jobsText(digest.jobs,names.buildings));
 if(digest.giftWaiting)lines.push(digest.streak>=2?`Your daily gift is waiting: keep your ${digest.streak}-day streak going`:'Your daily gift is waiting');
 return lines;
}
export function digestSubject(digest){
 if(digest.crops?.length)return `Your farm needs you: ${digest.crops.length} ${digest.crops.length===1?'crop':'crops'} ready`;
 if(digest.jobs?.length)return `Your farm needs you: ${digest.jobs.length} ${digest.jobs.length===1?'batch':'batches'} ready`;
 return 'Your daily gift is waiting';
}
export function digestEmail({digest,names,appUrl,unsubscribeUrl}){
 const lines=digestLines(digest,names),name=escape(digest.username??'farmer');
 const items=lines.map(line=>`<li style="margin:0 0 8px;">${escape(line)}</li>`).join('');
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(digestSubject(digest))}</title></head>
<body style="margin:0;padding:0;background:#f3e8e0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8e0;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffdf6;border-radius:22px;border:1px solid #eadfd4;">
<tr><td align="center" style="padding:24px 28px 0;"><img src="${appUrl}/assets/harvest-tycoon-logo.png" width="130" height="130" alt="Harvest Tycoon" style="display:block;border:0;width:130px;height:auto;"></td></tr>
<tr><td style="padding:8px 32px 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#3d3923;">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#3d3923;">Hi ${name}!</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#5d573f;">Your farm has something waiting:</p>
<ul style="margin:0 0 24px;padding-left:20px;font-size:16px;line-height:1.6;color:#3d3923;">${items}</ul></td></tr>
<tr><td align="center" style="padding:0 32px 8px;"><a href="${appUrl}/?source=email" style="display:inline-block;background:#685e3f;color:#fffdf0;text-decoration:none;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;padding:15px 30px;border-radius:12px;border-bottom:3px solid #494125;">Open my farm</a></td></tr>
<tr><td style="padding:22px 32px 28px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#857d70;">You get this email because you switched on the daily summary in Settings. It is sent once a day, and only when something is waiting. <a href="${unsubscribeUrl}" style="color:#5b5336;">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`;
 const text=`Hi ${digest.username??'farmer'}!\n\nYour farm has something waiting:\n${lines.map(l=>`- ${l}`).join('\n')}\n\nOpen your farm: ${appUrl}/?source=email\n\nYou get this email because you switched on the daily summary in Settings. Unsubscribe: ${unsubscribeUrl}\n`;
 return {subject:digestSubject(digest),html,text};
}

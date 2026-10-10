// A checkout's state in the admin panel's Purchases (10 Oct 2026), the plainest three: Paid; Open, its payment page may still be open
// (Stripe keeps one for 24 hours); Not paid, it ended without a payment (the page expired, the farmer closed it, or turned the app
// store's purchase down). Before, everything unpaid was "Not finished", so a page left a week ago looked like one still being paid.
export const PAGE_HOURS=24;
export function purchaseState(p,now=Date.now()){
 if(p?.status==='credited'||p?.status==='test_paid')return 'paid';
 if(p?.status==='refunded')return 'refunded';
 if(p?.status==='pending'&&now-Date.parse(p.createdAt)<PAGE_HOURS*3600000)return 'open';
 return 'unpaid';
}
export const PURCHASE_LABELS=Object.freeze({paid:['Paid','is-paid'],open:['Open','is-open'],unpaid:['Not paid','is-expired'],refunded:['Refunded','is-expired']});
// The totals line's counts: every checkout, then how many of them are paid, open and not paid.
export function purchaseCounts(list,now=Date.now()){
 const counts={paid:0,open:0,unpaid:0,refunded:0};
 for(const p of list??[])counts[purchaseState(p,now)]++;
 return counts;
}

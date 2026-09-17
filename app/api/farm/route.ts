// The former device-save recovery endpoint is retired. Existing D1 data is kept.
export const dynamic='force-dynamic';
const retired=()=>Response.json({error:'Sign in to load your online farm.'},{status:410,headers:{'Cache-Control':'no-store'}});
export const GET=retired;
export const POST=retired;

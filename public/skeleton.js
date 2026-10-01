// Placeholder rows in the shape of what is coming (1 Oct 2026): a window that has to wait for the server looks almost there,
// instead of saying "Opening…". The sentence stays for screen readers (and in the window's own language).
export function skeleton(label,{rows=4,hero=false,avatar=true}={}){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const row=`<div class="skeleton-row">${avatar?'<i></i>':''}<span><b></b><b></b></span></div>`;
 return `<div class="skeleton" role="status" aria-busy="true"><span class="skeleton-label">${esc(label)}</span>${hero?'<div class="skeleton-hero"><i></i><span><b></b><b></b></span></div>':''}${row.repeat(rows)}</div>`;
}

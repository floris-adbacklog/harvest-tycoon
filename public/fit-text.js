// A number in a tight pill (the coins and diamonds at the top on a phone): made smaller, a pixel at a time, just as far as it
// needs to fit, so it is never cut off to "1…" on any screen. Only measured again when the text or the room changes.
export function fitText(el,min=11){
 if(!el)return;
 const text=el.textContent,room=el.parentElement?.clientWidth??0;
 if(el.dataset.fitText===text&&Number(el.dataset.fitRoom)===room)return;
 el.dataset.fitText=text;el.dataset.fitRoom=String(room);el.style.fontSize='';
 if(el.scrollWidth<=el.clientWidth)return;
 let size=parseFloat(getComputedStyle(el).fontSize)||16;
 while(el.scrollWidth>el.clientWidth&&size>min){size-=1;el.style.fontSize=`${size}px`;}
}

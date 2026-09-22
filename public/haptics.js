// A short buzz on the moments that should feel good: a harvest, a sale, a reward, a level-up. Only on touch devices
// that support it (Android; iOS ignores navigator.vibrate), and never an error if it fails.
export const HAPTICS=Object.freeze({harvest:12,collect:14,sell:10,chore:10,reward:[16,40,16],diamond:[20,50,20,50,30],upgrade:[20,40,20],levelup:[30,60,30,60,90]});
export function haptic(kind,{nav=globalThis.navigator,touch=()=>globalThis.matchMedia?.('(pointer: coarse)').matches}={}){
 const pattern=HAPTICS[kind];if(!pattern||typeof nav?.vibrate!=='function'||!touch())return false;
 try{return nav.vibrate(pattern);}catch{return false;}
}

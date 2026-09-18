// Dispose only crop-specific clones; template materials and geometry are shared.
export function clearCropVisual(group){
 const owned=new Set();
 group.traverse(node=>{for(const material of [].concat(node.material??[]))if(material.userData?.farmCropOwned)owned.add(material);});
 owned.forEach(material=>material.dispose());group.clear();
}
export async function loadInBatches(items,load,concurrency=4){
 let next=0;
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{
  while(next<items.length){const index=next++;await load(items[index],index);}
 }));
}

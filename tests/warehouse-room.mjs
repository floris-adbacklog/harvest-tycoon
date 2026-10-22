import {RECIPES,WAREHOUSE_TOP_LEVEL} from '../game/farm-state.js';
// The Warehouse (22 Oct 2026): a test farm that holds 100 or 1,000 of every one of the 108 items is far over any Warehouse, so it could
// collect nothing. A test about making and collecting keeps only the stock its recipes use (their goods in and out, at most 400 of
// each), in the biggest Warehouse; everything else it asserts on is relative to that stock.
export function roomFor(s,recipes){
 const keep=new Set(recipes.flatMap(id=>[...Object.keys(RECIPES[id].input),...Object.keys(RECIPES[id].output)]));
 for(const k of Object.keys(s.inventory))s.inventory[k]=keep.has(k)?Math.min(400,s.inventory[k]):0;
 s.warehouse={level:WAREHOUSE_TOP_LEVEL};return s;
}

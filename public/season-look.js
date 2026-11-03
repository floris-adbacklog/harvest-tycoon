// The farm's trees and bushes in the colours of the season (3 Nov 2026, the owner picked it from the ithappy Studios Vegetation pack):
// autumn orange and yellow, from 22 December snow, in spring blossom, in summer the green they always had. Look only: nothing a farmer
// does or owns changes, and every tree and bush stands where it always stood.
//
// The farm keeps its own model names (tree_004 is still "the oak" everywhere: the scenery, the sway, Move things, the pond's and roads'
// clearing), and game.js loadModel only fetches another file for it: SEASON_SWAPS below. A swap has the same kind of shape at about the
// same size (the pack's bushes are the Farm pack's bushes in other colours, triangle for triangle), so a phone draws no more than
// before. Only the season's own files are fetched; summer fetches none. The crops' own models keep theirs in every season: the apple
// tree (tree_009), the berry bush (bush_003, also the Season Pass's red cranberries) and the cider apple and cherry trees (tree_010, tree_011).
import {SEASON_IDS,seasonById,seasonPhase} from './farm-state.js';

export const FARM_SEASONS=Object.freeze(['spring','summer','autumn','winter']);
// The season the farm shows: the Season Pass's open season (Autumn 2026 until 22 December, then Winter), else the date's (the same
// astronomical seasons the passes follow): winter from 22 December, spring from 21 March, summer from 21 June, autumn from 22 September.
// A farmer can pick one in Settings › Graphics (3 Nov 2026, the owner: "Zet in Settings het seizoen"), kept on this device; Automatic
// (nothing kept) follows the game's. ?season=spring|summer|autumn|winter shows another one (the harness; it changes nothing else).
export const SEASON_CHOICE_KEY='harvest-tycoon:season-look';
export function chosenSeason(storage=globalThis.localStorage){try{const kept=storage?.getItem(SEASON_CHOICE_KEY);return FARM_SEASONS.includes(kept)?kept:'';}catch{return '';}}
export function chooseSeason(season,storage=globalThis.localStorage){try{if(FARM_SEASONS.includes(season))storage?.setItem(SEASON_CHOICE_KEY,season);else storage?.removeItem(SEASON_CHOICE_KEY);}catch{}}
export function farmSeason(now=Date.now(),search=globalThis.location?.search??'',storage=globalThis.localStorage){
 let asked=null;try{asked=new URLSearchParams(search).get('season');}catch{}
 if(FARM_SEASONS.includes(asked))return asked;
 const chosen=chosenSeason(storage);if(chosen)return chosen;
 const open=SEASON_IDS.map(seasonById).find(s=>seasonPhase(s,now)==='open'),named=open?.name?.toLowerCase();
 if(FARM_SEASONS.includes(named))return named;
 const d=new Date(now),day=(d.getUTCMonth()+1)*100+d.getUTCDate();
 return day>=1222||day<321?'winter':day<621?'spring':day<922?'summer':'autumn';
}

// [the farm's model]: the Vegetation pack's model (veg_*, public/assets/models) it is drawn with in that season.
export const SEASON_SWAPS=Object.freeze({
 // Two of the young trees in pink and salmon blossom; the rest stays the fresh green of summer.
 spring:Object.freeze({tree_002:'veg_bush_001',tree_005:'veg_bush_002'}),
 summer:Object.freeze({}),
 // The small round bush (bush_001, hundreds along the fences and roads) stays green in autumn: yellow everywhere turned the valley yellow.
 autumn:Object.freeze({
  tree_001:'veg_tree_021',tree_002:'veg_tree_026',tree_005:'veg_tree_026',tree_004:'veg_tree_020',tree_007:'veg_tree_020',
  tree_006:'veg_tree_025',tree_008:'veg_tree_035',
  bush_002:'veg_bush_009',bush_004:'veg_bush_003'
 }),
 // Snow on the firs and the bushes; the oak and the birch stand bare with snow on their branches, the other trees are snowy firs.
 winter:Object.freeze({
  tree_001:'veg_fir_snow_004',tree_006:'veg_fir_snow_001',tree_002:'veg_fir_snow_003',tree_005:'veg_fir_snow_003',
  tree_007:'veg_fir_snow_003',tree_004:'veg_deadwood_snow_009',tree_008:'veg_deadwood_snow_010',
  fir_tree_001:'veg_fir_snow_001',fir_tree_003:'veg_fir_snow_004',fir_tree_010:'veg_fir_snow_001',
  fir_tree_004:'veg_fir_snow_003',fir_tree_006:'veg_fir_snow_003',fir_tree_007:'veg_fir_snow_003',
  bush_001:'veg_bush_014',bush_002:'veg_bush_013',bush_004:'veg_bush_011'
 })
});
// The file a model of the farm is drawn from this season: its own, or its season's swap.
export const seasonFile=(name,season)=>SEASON_SWAPS[season]?.[name]??name;

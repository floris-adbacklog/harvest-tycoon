import {guidedFarm,featureUnlocked,featureUnlockHint,FAMILY_MIN_LEVEL} from './farm-state.js';
import {art,refreshArt} from './visual-icons.js';

export function renderFarmGuide(state){
 const steps=[
  ['farm','Make yourself at home',guidedFarm(state)?'Start with Wheat, Corn and the Chicken Coop. New crops and productions open gradually through level 25. Buy buildings when you are ready; your next milestones are in the journal.':'Grow crops, make goods and build your farm at your own pace. Check the shops for your next unlocks.'],
  ['seeds','Plant, care and harvest','Choose a crop and tap an empty field. Water and care for it to improve your harvest. Tap the golden basket when it is ready.'],
  ['harvest','Explore your farm','Drag to move around and pinch to zoom on mobile. Ready crops wait for you. Apples and Berries start growing again after you collect them.'],
  ['buildings','Turn crops into goods','Tap a building to start production. Higher building levels allow more batches at once. Use Collect all when several are ready.'],
  ['market','Sell or save for later','Choose how much to sell in Market. Prices change daily, so keep useful ingredients for production and orders. Visit Today for gifts, challenges and deliveries.'],
  ['helping-hand','Lend a hand',`${featureUnlocked(state,'activities')?'Tap the Greenhouse, Apiary, animals or Tool workshop.':featureUnlockHint('activities')} Help the three items that need attention to earn rewards. Visit all four stops for a bonus.`],
  ['hammer','Grow your farm','Upgrade buildings with coins or diamonds, and visit the Farmhouse for more fields. Later, discover the tractor, silo research, fertilizer and farm chores.'],
  ['diamonds','A little extra help','Spend diamonds on useful boosts, finishing a crop or batch, or replacing an order. The shop shows exactly what each option does and costs.'],
  ['quests','Celebrate your progress',`Finish quests and level up for rewards. At level ${FAMILY_MIN_LEVEL}, visit the Family Hall to share weekly orders and enter the Family Tournament. Estate has six chapters, followed by ongoing commissions.`]
 ];
 document.querySelector('#help-dialog .help-steps').innerHTML=steps.map(([icon,title,copy])=>`<li>${art(icon)}<div><strong>${title}</strong><p>${copy}</p></div></li>`).join('');
 refreshArt();
}

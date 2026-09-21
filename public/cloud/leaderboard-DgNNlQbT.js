//#region public/player-avatars.js
var e = Object.freeze([
	{
		id: "default",
		name: "Original farmer",
		src: "/assets/farmer-avatar.webp"
	},
	{
		id: "orchard-grower",
		name: "Orchard grower",
		src: "/assets/avatars/orchard-grower.webp"
	},
	{
		id: "field-keeper",
		name: "Field keeper",
		src: "/assets/avatars/field-keeper.webp"
	},
	{
		id: "berry-gardener",
		name: "Berry gardener",
		src: "/assets/avatars/berry-gardener.webp"
	},
	{
		id: "mill-worker",
		name: "Mill worker",
		src: "/assets/avatars/mill-worker.webp"
	},
	{
		id: "sunflower-grower",
		name: "Sunflower grower",
		src: "/assets/avatars/sunflower-grower.webp"
	},
	{
		id: "village-gardener",
		name: "Village gardener",
		src: "/assets/avatars/village-gardener.webp"
	},
	{
		id: "old-hand",
		name: "Old hand",
		src: "/assets/avatars/old-hand.webp"
	},
	{
		id: "greenhouse-grower",
		name: "Greenhouse grower",
		src: "/assets/avatars/greenhouse-grower.webp"
	},
	{
		id: "beekeeper",
		name: "Beekeeper",
		src: "/assets/avatars/beekeeper.webp"
	},
	{
		id: "market-gardener",
		name: "Market gardener",
		src: "/assets/avatars/market-gardener.webp"
	},
	{
		id: "dairy-farmer",
		name: "Dairy farmer",
		src: "/assets/avatars/dairy-farmer.webp"
	},
	{
		id: "meadow-keeper",
		name: "Meadow keeper",
		src: "/assets/avatars/meadow-keeper.webp"
	},
	{
		id: "apple-picker",
		name: "Apple picker",
		src: "/assets/avatars/apple-picker.webp"
	},
	{
		id: "herb-gardener",
		name: "Herb gardener",
		src: "/assets/avatars/herb-gardener.webp"
	},
	{
		id: "barn-builder",
		name: "Barn builder",
		src: "/assets/avatars/barn-builder.webp"
	},
	{
		id: "flower-grower",
		name: "Flower grower",
		src: "/assets/avatars/flower-grower.webp"
	},
	{
		id: "harvest-helper",
		name: "Harvest helper",
		src: "/assets/avatars/harvest-helper.webp"
	},
	{
		id: "valley-grower",
		name: "Valley grower",
		src: "/assets/avatars/valley-grower.webp"
	},
	{
		id: "orchard-veteran",
		name: "Orchard veteran",
		src: "/assets/avatars/orchard-veteran.webp"
	},
	{
		id: "farm-mechanic",
		name: "Farm mechanic",
		src: "/assets/avatars/farm-mechanic.webp"
	}
].map(Object.freeze)), t = new Map(e.map((e) => [e.id, e])), n = (e) => t.get(e) ?? t.get("default"), r = (e) => `<img class="player-avatar-thumb" src="${n(e).src}" alt="" width="48" height="48" loading="lazy" decoding="async" draggable="false">`;
//#endregion
//#region public/vip-ui.js
function i(e) {
	let t = typeof e == "string" ? Date.parse(e) : e;
	return Number.isSafeInteger(t) && t > 0 ? t : 0;
}
function a(e, t = Date.now(), n = !1) {
	let r = i(e);
	return r <= t ? "" : `<span class="vip-badge${n ? " vip-badge-detail" : ""}" data-vip-until="${r}" title="VIP farmer" aria-label="VIP farmer"><img src="/assets/icons/vip.png" alt="" width="24" height="24">${n ? "<span data-vip-remaining></span>" : ""}</span>`;
}
function o(e, t = Date.now()) {
	e.querySelectorAll("[data-vip-until]").forEach((e) => {
		let n = i(Number(e.dataset.vipUntil)) - t;
		if (n <= 0) {
			e.remove();
			return;
		}
		let r = e.querySelector("[data-vip-remaining]");
		if (r) {
			let e = Math.ceil(n / 6e4);
			r.textContent = `VIP · ${e >= 1440 ? `${Math.floor(e / 1440)}d ${Math.floor(e % 1440 / 60)}h` : e >= 60 ? `${Math.floor(e / 60)}h ${e % 60}m` : `${e}m`} left`;
		}
	});
}
//#endregion
//#region public/visual-icons.js
var s = [
	{
		file: "crops-v2.png",
		columns: 3,
		keys: [
			"wheat",
			"lettuce",
			"corn",
			"barley",
			"cabbage",
			"cauliflower",
			"pumpkin",
			"redcabbage",
			"sunflower"
		]
	},
	{
		file: "goods-v2.png",
		columns: 4,
		keys: [
			"grainmeal",
			"flour",
			"feed",
			"fertilizer",
			"salad",
			"pickles",
			"oil",
			"milk",
			"eggs",
			"cheese",
			"bread",
			"pie",
			"vegetables",
			"tractor",
			"silo",
			"cart"
		]
	},
	{
		file: "interface-v2.png",
		columns: 4,
		keys: [
			"farm",
			"estate",
			"buildings",
			"market",
			"gift",
			"quests",
			"boost",
			"trophy",
			"coins",
			"diamonds",
			"seeds",
			"water",
			"harvest",
			"care",
			"hammer",
			"xp"
		]
	}
], c = {
	vip: "vip",
	"familyhall-model": "familyhall-model",
	lock: "lock",
	"family-weekly-order": "family-weekly-order",
	"family-members": "family-members",
	"family-tournament": "family-tournament",
	"family-management": "family-management",
	familyhall: "familyhall",
	"helping-hand": "helping-hand",
	"collect-all": "collect-all",
	"instant-harvest": "instant-harvest",
	farmhouse: "farmhouse",
	mill: "mill",
	dairy: "dairy",
	coop: "coop",
	bakery: "bakery",
	packing: "packing",
	windmill: "windmill",
	stall: "stall",
	chores: "chores",
	honey: "honey"
};
for (let e of [
	"rank-gold",
	"rank-silver",
	"rank-bronze",
	"family-bee",
	"family-oak",
	"family-barn"
]) c[e] = e;
for (let e of [
	"weeds",
	"troughs",
	"sorting",
	"fences",
	"irrigation",
	"harvestfair"
]) c[`chore-${e}`] = `chore-${e}`;
for (let e of [
	"greenhouse",
	"apiary",
	"paddock",
	"workshop"
]) c[`activity-${e}`] = `activity-${e}`;
for (let e of [
	"apples",
	"berries",
	"greenbeans",
	"applejuice",
	"applepie",
	"berrypreserves",
	"berrytart",
	"stew",
	"juicepress",
	"preserves",
	"kitchen"
]) c[e] = e;
for (let e of [
	"orchardjuice",
	"berrysmoothie",
	"applecompote",
	"applevinegar",
	"pickledbeans",
	"beangratin",
	"orchardsalad",
	"berrycheesecake",
	"harvesthamper"
]) c[e] = e;
var l = new Set([
	"guide",
	"sound",
	"streak",
	"settings",
	"reminders",
	"farmapp"
]);
for (let e of l) c[e] = e;
var u = Object.fromEntries(s.flatMap((e) => e.keys.map((t, n) => [t, {
	...e,
	index: n
}])));
Object.freeze([...Object.keys(u), ...Object.keys(c)]);
function d(e, t = "") {
	let n = u[e];
	if (n) {
		let { file: r, columns: i, index: a } = n, o = a % i / (i - 1) * 100, s = Math.floor(a / i) / (i - 1) * 100;
		return `<span class="game-art game-art-sprite ${t}" data-art="${e}" aria-hidden="true" style="--art-sheet:url('/assets/icons/${r}');--art-size:${i * 100}%;--art-position:${o}% ${s}%"></span>`;
	}
	return c[e] ? `<img class="game-art ${t}" data-art="${e}" src="/assets/icons/${c[e]}.${l.has(e) ? "svg" : "png"}" alt="" draggable="false">` : "";
}
//#endregion
//#region public/rank-art.js
function f(e) {
	return Number.isInteger(e) && e >= 1 && e <= 3 ? `<span class="rank-trophy" role="img" aria-label="${[
		"Gold",
		"Silver",
		"Bronze"
	][e - 1]} trophy · Place ${e}">${d([
		"rank-gold",
		"rank-silver",
		"rank-bronze"
	][e - 1])}</span>` : `<span class="rank-number">${Number.isInteger(e) ? e : ""}</span>`;
}
//#endregion
//#region src/leaderboard.js
var p = Object.freeze({
	level: {
		label: "Highest level",
		heading: "Level",
		unit: "level",
		description: "Your farmer level, earned through farming experience."
	},
	currency: {
		label: "Most coins",
		heading: "Coins",
		unit: "coins",
		description: "Current coin balance. Spending coins can change your position."
	},
	harvested_crops: {
		label: "Most crops harvested",
		heading: "Crops",
		unit: "crops harvested",
		description: "Lifetime harvest of all crop varieties, including extra yield from water and care."
	},
	goods_produced: {
		label: "Most goods produced",
		heading: "Goods produced",
		unit: "goods produced",
		description: "Lifetime production goods collected from every building, from honey to berry tart."
	},
	items_sold: {
		label: "Most items sold",
		heading: "Items sold",
		unit: "items sold",
		description: "Lifetime crops and goods sold at the market. Counts from when this board launched."
	},
	badges: {
		label: "Most badges",
		heading: "Badges",
		unit: "badges",
		description: "Crop mastery medals you have claimed. Up to 48 badges to earn."
	},
	deliveries: {
		label: "Most deliveries",
		heading: "Deliveries",
		unit: "deliveries",
		description: "Total delivery orders completed for your neighbours."
	},
	harvested_wheat: {
		label: "Wheat harvested",
		heading: "Wheat",
		unit: "wheat harvested",
		group: "crops",
		description: "Lifetime wheat harvested, including extra yield from water and care."
	},
	harvested_corn: {
		label: "Corn harvested",
		heading: "Corn",
		unit: "corn harvested",
		group: "crops",
		description: "Lifetime corn harvested, including extra yield from water and care."
	},
	harvested_barley: {
		label: "Barley harvested",
		heading: "Barley",
		unit: "barley harvested",
		group: "crops",
		description: "Lifetime barley harvested, including extra yield from water and care."
	},
	harvested_lettuce: {
		label: "Lettuce harvested",
		heading: "Lettuce",
		unit: "lettuce harvested",
		group: "crops",
		description: "Lifetime lettuce harvested, including extra yield from water and care."
	},
	harvested_cabbage: {
		label: "Cabbage harvested",
		heading: "Cabbage",
		unit: "cabbage harvested",
		group: "crops",
		description: "Lifetime cabbage harvested, including extra yield from water and care."
	},
	harvested_cauliflower: {
		label: "Cauliflower harvested",
		heading: "Cauliflower",
		unit: "cauliflower harvested",
		group: "crops",
		description: "Lifetime cauliflower harvested, including extra yield from water and care."
	},
	harvested_pumpkin: {
		label: "Pumpkin harvested",
		heading: "Pumpkin",
		unit: "pumpkin harvested",
		group: "crops",
		description: "Lifetime pumpkin harvested, including extra yield from water and care."
	},
	harvested_redcabbage: {
		label: "Red cabbage harvested",
		heading: "Red cabbage",
		unit: "red cabbage harvested",
		group: "crops",
		description: "Lifetime red cabbage harvested, including extra yield from water and care."
	},
	harvested_sunflower: {
		label: "Sunflower harvested",
		heading: "Sunflower",
		unit: "sunflower harvested",
		group: "crops",
		description: "Lifetime sunflower harvested, including extra yield from water and care."
	},
	harvested_greenbeans: {
		label: "Green beans harvested",
		heading: "Green beans",
		unit: "green beans harvested",
		group: "crops",
		description: "Lifetime green beans harvested, including water and care bonuses."
	},
	harvested_apples: {
		label: "Apples harvested",
		heading: "Apples",
		unit: "apples harvested",
		group: "crops",
		description: "Lifetime apples harvested, including water and care bonuses."
	},
	harvested_berries: {
		label: "Berries harvested",
		heading: "Berries",
		unit: "berries harvested",
		group: "crops",
		description: "Lifetime berries harvested, including water and care bonuses."
	}
});
function m(e) {
	if (!Object.hasOwn(p, e)) throw Error("Choose a valid leaderboard category.");
	return p[e];
}
var h = "player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_greenbeans,harvested_apples,harvested_berries,harvested_crops,badges,deliveries,goods_produced,items_sold,last_active_at,vip_expires_at,avatar_id";
async function g(e, t, n = "level") {
	m(n);
	let { data: r, error: i } = await e.from("player_stats").select(h).order(n, { ascending: !1 }).order("player_id", { ascending: !0 }).limit(10);
	if (i) throw i;
	let a = r?.find((e) => e.player_id === t) ?? null;
	if (!a && t) {
		let n = await e.from("player_stats").select(h).eq("player_id", t).maybeSingle();
		if (n.error) throw n.error;
		a = n.data;
	}
	let o = null;
	if (a) {
		let i = r?.findIndex((e) => e.player_id === t) ?? -1;
		if (i >= 0) o = i + 1;
		else {
			let t = await e.from("player_stats").select("player_id", {
				count: "exact",
				head: !0
			}).gt(n, a[n]);
			if (t.error) throw t.error;
			let r = await e.from("player_stats").select("player_id", {
				count: "exact",
				head: !0
			}).eq(n, a[n]).lt("player_id", a.player_id);
			if (r.error) throw r.error;
			o = (t.count ?? 0) + (r.count ?? 0) + 1;
		}
	}
	return {
		rows: r ?? [],
		own: a,
		rank: o,
		category: n
	};
}
function _(e, t = "level") {
	return m(t), e.map((e, n) => ({
		row: e,
		rank: n + 1,
		score: Number(e[t] ?? 0)
	}));
}
function v(e, { rows: t, own: n, rank: i, category: o = "level", onlinePlayers: s = [], presenceReady: c = !1, now: l = Date.now() }, u, d) {
	let p = m(o);
	if (e.replaceChildren(), !t.length) {
		let t = document.createElement("p");
		t.className = "leaderboard-empty", t.textContent = "The valley is quiet. Be the first farmer on this board.", e.append(t);
		return;
	}
	let h = document.createElement("table");
	h.className = "leaderboard-table";
	let g = document.createElement("caption");
	g.className = "leaderboard-caption", g.textContent = `${p.label} · Top 10`, h.append(g);
	let v = document.createElement("thead"), b = document.createElement("tr");
	for (let e of [
		"Rank",
		"Farmer",
		p.heading
	]) {
		let t = document.createElement("th");
		t.scope = "col", t.textContent = e, b.append(t);
	}
	v.append(b), h.append(v);
	let x = document.createElement("tbody");
	if (_(t, o).forEach(({ row: e, rank: t, score: n }) => {
		let i = document.createElement("tr");
		i.classList.toggle("is-you", e.player_id === u);
		let o = document.createElement("td");
		o.className = "leaderboard-place", o.innerHTML = f(t);
		let s = document.createElement("td"), c = document.createElement(d ? "button" : "strong"), p = document.createElement("small");
		c.textContent = e.username, d && (c.type = "button", c.className = "player-name-link", c.setAttribute("aria-haspopup", "dialog"), c.setAttribute("aria-label", `View ${e.username}'s profile`), c.onclick = () => d(e.player_id));
		let m = document.createElement("span");
		m.className = "online-dot", m.dataset.onlinePlayer = e.player_id, m.setAttribute("role", "img"), c.prepend(m);
		let h = a(e.vip_expires_at, l);
		h && c.insertAdjacentHTML("beforeend", h), p.textContent = `Level ${e.level}${e.player_id === u ? " · You" : ""}`;
		let g = document.createElement("div");
		g.className = "leaderboard-farmer", g.innerHTML = r(e.avatar_id);
		let _ = document.createElement("div");
		_.append(c, p), g.append(_), s.append(g);
		let v = document.createElement("td");
		v.textContent = n.toLocaleString("en-US"), i.append(o, s, v), x.append(i);
	}), h.append(x), e.append(h), y(e, {
		onlinePlayers: s,
		presenceReady: c,
		now: l
	}), n && i) {
		let t = document.createElement("div");
		t.className = "your-rank";
		let r = document.createElement("strong"), a = document.createElement("span");
		r.textContent = `Your rank: #${i}`;
		let s = Number(n[o] ?? 0).toLocaleString("en-US");
		a.textContent = o === "level" ? `Level ${s} · ${n.username}` : `${s} ${p.unit} · ${n.username}`, t.append(r, a), e.append(t);
	}
}
function y(e, { onlinePlayers: t = [], presenceReady: n = !1, now: r = Date.now() }) {
	o(e, r);
	let i = new Set(t);
	e.querySelectorAll("[data-online-player]").forEach((e) => {
		let t = n && i.has(e.dataset.onlinePlayer);
		e.classList.toggle("is-online", t), e.title = t ? "Online · active within the last 30 minutes" : n ? "Offline · no action in the last 30 minutes" : "Online status unavailable", e.setAttribute("aria-label", e.title);
	});
}
//#endregion
export { d as a, e as c, y as i, r as l, g as n, o, v as r, a as s, p as t, n as u };

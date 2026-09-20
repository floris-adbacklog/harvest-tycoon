//#region public/visual-icons.js
var e = [
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
], t = {
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
]) t[e] = e;
for (let e of [
	"weeds",
	"troughs",
	"sorting",
	"fences",
	"irrigation",
	"harvestfair"
]) t[`chore-${e}`] = `chore-${e}`;
for (let e of [
	"greenhouse",
	"apiary",
	"paddock",
	"workshop"
]) t[`activity-${e}`] = `activity-${e}`;
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
]) t[e] = e;
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
]) t[e] = e;
var n = new Set([
	"guide",
	"sound",
	"streak"
]);
for (let e of n) t[e] = e;
var r = Object.fromEntries(e.flatMap((e) => e.keys.map((t, n) => [t, {
	...e,
	index: n
}])));
Object.freeze([...Object.keys(r), ...Object.keys(t)]);
function i(e, i = "") {
	let a = r[e];
	if (a) {
		let { file: t, columns: n, index: r } = a, o = r % n / (n - 1) * 100, s = Math.floor(r / n) / (n - 1) * 100;
		return `<span class="game-art game-art-sprite ${i}" data-art="${e}" aria-hidden="true" style="--art-sheet:url('/assets/icons/${t}');--art-size:${n * 100}%;--art-position:${o}% ${s}%"></span>`;
	}
	return t[e] ? `<img class="game-art ${i}" data-art="${e}" src="/assets/icons/${t[e]}.${n.has(e) ? "svg" : "png"}" alt="" draggable="false">` : "";
}
//#endregion
//#region public/rank-art.js
function a(e) {
	return Number.isInteger(e) && e >= 1 && e <= 3 ? `<span class="rank-trophy" role="img" aria-label="${[
		"Gold",
		"Silver",
		"Bronze"
	][e - 1]} trophy · Place ${e}">${i([
		"rank-gold",
		"rank-silver",
		"rank-bronze"
	][e - 1])}</span>` : `<span class="rank-number">${Number.isInteger(e) ? e : ""}</span>`;
}
//#endregion
//#region src/leaderboard.js
var o = Object.freeze({
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
function s(e) {
	if (!Object.hasOwn(o, e)) throw Error("Choose a valid leaderboard category.");
	return o[e];
}
var c = "player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_greenbeans,harvested_apples,harvested_berries,harvested_crops,badges,deliveries,goods_produced,items_sold,last_active_at";
async function l(e, t, n = "level") {
	s(n);
	let { data: r, error: i } = await e.from("player_stats").select(c).order(n, { ascending: !1 }).order("player_id", { ascending: !0 }).limit(10);
	if (i) throw i;
	let a = r?.find((e) => e.player_id === t) ?? null;
	if (!a && t) {
		let n = await e.from("player_stats").select(c).eq("player_id", t).maybeSingle();
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
function u(e, t = "level") {
	return s(t), e.map((e, n) => ({
		row: e,
		rank: n + 1,
		score: Number(e[t] ?? 0)
	}));
}
function d(e, { rows: t, own: n, rank: r, category: i = "level", onlinePlayers: o = [], presenceReady: c = !1 }, l, d) {
	let p = s(i);
	if (e.replaceChildren(), !t.length) {
		let t = document.createElement("p");
		t.className = "leaderboard-empty", t.textContent = "The valley is quiet. Be the first farmer on this board.", e.append(t);
		return;
	}
	let m = document.createElement("table");
	m.className = "leaderboard-table";
	let h = document.createElement("caption");
	h.className = "leaderboard-caption", h.textContent = `${p.label} · Top 10`, m.append(h);
	let g = document.createElement("thead"), _ = document.createElement("tr");
	for (let e of [
		"Rank",
		"Farmer",
		p.heading
	]) {
		let t = document.createElement("th");
		t.scope = "col", t.textContent = e, _.append(t);
	}
	g.append(_), m.append(g);
	let v = document.createElement("tbody");
	if (u(t, i).forEach(({ row: e, rank: t, score: n }) => {
		let r = document.createElement("tr");
		r.classList.toggle("is-you", e.player_id === l);
		let i = document.createElement("td");
		i.className = "leaderboard-place", i.innerHTML = a(t);
		let o = document.createElement("td"), s = document.createElement(d ? "button" : "strong"), c = document.createElement("small");
		s.textContent = e.username, d && (s.type = "button", s.className = "player-name-link", s.setAttribute("aria-haspopup", "dialog"), s.setAttribute("aria-label", `View ${e.username}'s profile`), s.onclick = () => d(e.player_id));
		let u = document.createElement("span");
		u.className = "online-dot", u.dataset.onlinePlayer = e.player_id, u.setAttribute("role", "img"), s.prepend(u), c.textContent = `Level ${e.level}${e.player_id === l ? " · You" : ""}`, o.append(s, c);
		let f = document.createElement("td");
		f.textContent = n.toLocaleString("en-US"), r.append(i, o, f), v.append(r);
	}), m.append(v), e.append(m), f(e, {
		onlinePlayers: o,
		presenceReady: c
	}), n && r) {
		let t = document.createElement("div");
		t.className = "your-rank";
		let a = document.createElement("strong"), o = document.createElement("span");
		a.textContent = `Your rank: #${r}`;
		let s = Number(n[i] ?? 0).toLocaleString("en-US");
		o.textContent = i === "level" ? `Level ${s} · ${n.username}` : `${s} ${p.unit} · ${n.username}`, t.append(a, o), e.append(t);
	}
}
function f(e, { onlinePlayers: t = [], presenceReady: n = !1 }) {
	let r = new Set(t);
	e.querySelectorAll("[data-online-player]").forEach((e) => {
		let t = n && r.has(e.dataset.onlinePlayer);
		e.classList.toggle("is-online", t), e.title = t ? "Online · active within the last 30 minutes" : n ? "Offline · no action in the last 30 minutes" : "Online status unavailable", e.setAttribute("aria-label", e.title);
	});
}
//#endregion
export { i as a, f as i, l as n, d as r, o as t };

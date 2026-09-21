//#region public/vip-ui.js
function e(e) {
	let t = typeof e == "string" ? Date.parse(e) : e;
	return Number.isSafeInteger(t) && t > 0 ? t : 0;
}
function t(t, n = Date.now(), r = !1) {
	let i = e(t);
	return i <= n ? "" : `<span class="vip-badge${r ? " vip-badge-detail" : ""}" data-vip-until="${i}" title="VIP farmer" aria-label="VIP farmer"><img src="/assets/icons/vip.png" alt="" width="24" height="24">${r ? "<span data-vip-remaining></span>" : ""}</span>`;
}
function n(t, n = Date.now()) {
	t.querySelectorAll("[data-vip-until]").forEach((t) => {
		let r = e(Number(t.dataset.vipUntil)) - n;
		if (r <= 0) {
			t.remove();
			return;
		}
		let i = t.querySelector("[data-vip-remaining]");
		if (i) {
			let e = Math.ceil(r / 6e4);
			i.textContent = `VIP · ${e >= 1440 ? `${Math.floor(e / 1440)}d ${Math.floor(e % 1440 / 60)}h` : e >= 60 ? `${Math.floor(e / 60)}h ${e % 60}m` : `${e}m`} left`;
		}
	});
}
//#endregion
//#region public/visual-icons.js
var r = [
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
], i = {
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
]) i[e] = e;
for (let e of [
	"weeds",
	"troughs",
	"sorting",
	"fences",
	"irrigation",
	"harvestfair"
]) i[`chore-${e}`] = `chore-${e}`;
for (let e of [
	"greenhouse",
	"apiary",
	"paddock",
	"workshop"
]) i[`activity-${e}`] = `activity-${e}`;
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
]) i[e] = e;
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
]) i[e] = e;
var a = new Set([
	"guide",
	"sound",
	"streak",
	"settings"
]);
for (let e of a) i[e] = e;
var o = Object.fromEntries(r.flatMap((e) => e.keys.map((t, n) => [t, {
	...e,
	index: n
}])));
Object.freeze([...Object.keys(o), ...Object.keys(i)]);
function s(e, t = "") {
	let n = o[e];
	if (n) {
		let { file: r, columns: i, index: a } = n, o = a % i / (i - 1) * 100, s = Math.floor(a / i) / (i - 1) * 100;
		return `<span class="game-art game-art-sprite ${t}" data-art="${e}" aria-hidden="true" style="--art-sheet:url('/assets/icons/${r}');--art-size:${i * 100}%;--art-position:${o}% ${s}%"></span>`;
	}
	return i[e] ? `<img class="game-art ${t}" data-art="${e}" src="/assets/icons/${i[e]}.${a.has(e) ? "svg" : "png"}" alt="" draggable="false">` : "";
}
//#endregion
//#region public/rank-art.js
function c(e) {
	return Number.isInteger(e) && e >= 1 && e <= 3 ? `<span class="rank-trophy" role="img" aria-label="${[
		"Gold",
		"Silver",
		"Bronze"
	][e - 1]} trophy · Place ${e}">${s([
		"rank-gold",
		"rank-silver",
		"rank-bronze"
	][e - 1])}</span>` : `<span class="rank-number">${Number.isInteger(e) ? e : ""}</span>`;
}
//#endregion
//#region src/leaderboard.js
var l = Object.freeze({
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
function u(e) {
	if (!Object.hasOwn(l, e)) throw Error("Choose a valid leaderboard category.");
	return l[e];
}
var d = "player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_greenbeans,harvested_apples,harvested_berries,harvested_crops,badges,deliveries,goods_produced,items_sold,last_active_at,vip_expires_at";
async function f(e, t, n = "level") {
	u(n);
	let { data: r, error: i } = await e.from("player_stats").select(d).order(n, { ascending: !1 }).order("player_id", { ascending: !0 }).limit(10);
	if (i) throw i;
	let a = r?.find((e) => e.player_id === t) ?? null;
	if (!a && t) {
		let n = await e.from("player_stats").select(d).eq("player_id", t).maybeSingle();
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
function p(e, t = "level") {
	return u(t), e.map((e, n) => ({
		row: e,
		rank: n + 1,
		score: Number(e[t] ?? 0)
	}));
}
function m(e, { rows: n, own: r, rank: i, category: a = "level", onlinePlayers: o = [], presenceReady: s = !1, now: l = Date.now() }, d, f) {
	let m = u(a);
	if (e.replaceChildren(), !n.length) {
		let t = document.createElement("p");
		t.className = "leaderboard-empty", t.textContent = "The valley is quiet. Be the first farmer on this board.", e.append(t);
		return;
	}
	let g = document.createElement("table");
	g.className = "leaderboard-table";
	let _ = document.createElement("caption");
	_.className = "leaderboard-caption", _.textContent = `${m.label} · Top 10`, g.append(_);
	let v = document.createElement("thead"), y = document.createElement("tr");
	for (let e of [
		"Rank",
		"Farmer",
		m.heading
	]) {
		let t = document.createElement("th");
		t.scope = "col", t.textContent = e, y.append(t);
	}
	v.append(y), g.append(v);
	let b = document.createElement("tbody");
	if (p(n, a).forEach(({ row: e, rank: n, score: r }) => {
		let i = document.createElement("tr");
		i.classList.toggle("is-you", e.player_id === d);
		let a = document.createElement("td");
		a.className = "leaderboard-place", a.innerHTML = c(n);
		let o = document.createElement("td"), s = document.createElement(f ? "button" : "strong"), u = document.createElement("small");
		s.textContent = e.username, f && (s.type = "button", s.className = "player-name-link", s.setAttribute("aria-haspopup", "dialog"), s.setAttribute("aria-label", `View ${e.username}'s profile`), s.onclick = () => f(e.player_id));
		let p = document.createElement("span");
		p.className = "online-dot", p.dataset.onlinePlayer = e.player_id, p.setAttribute("role", "img"), s.prepend(p);
		let m = t(e.vip_expires_at, l);
		m && s.insertAdjacentHTML("beforeend", m), u.textContent = `Level ${e.level}${e.player_id === d ? " · You" : ""}`, o.append(s, u);
		let h = document.createElement("td");
		h.textContent = r.toLocaleString("en-US"), i.append(a, o, h), b.append(i);
	}), g.append(b), e.append(g), h(e, {
		onlinePlayers: o,
		presenceReady: s,
		now: l
	}), r && i) {
		let t = document.createElement("div");
		t.className = "your-rank";
		let n = document.createElement("strong"), o = document.createElement("span");
		n.textContent = `Your rank: #${i}`;
		let s = Number(r[a] ?? 0).toLocaleString("en-US");
		o.textContent = a === "level" ? `Level ${s} · ${r.username}` : `${s} ${m.unit} · ${r.username}`, t.append(n, o), e.append(t);
	}
}
function h(e, { onlinePlayers: t = [], presenceReady: r = !1, now: i = Date.now() }) {
	n(e, i);
	let a = new Set(t);
	e.querySelectorAll("[data-online-player]").forEach((e) => {
		let t = r && a.has(e.dataset.onlinePlayer);
		e.classList.toggle("is-online", t), e.title = t ? "Online · active within the last 30 minutes" : r ? "Offline · no action in the last 30 minutes" : "Online status unavailable", e.setAttribute("aria-label", e.title);
	});
}
//#endregion
export { s as a, h as i, f as n, n as o, m as r, t as s, l as t };

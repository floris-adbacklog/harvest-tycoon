//#region src/leaderboard.js
var e = Object.freeze({
	currency: {
		label: "Most coins",
		heading: "Coins",
		unit: "coins",
		description: "Current coin balance. Spending coins can change your position."
	},
	level: {
		label: "Highest level",
		heading: "Level",
		unit: "level",
		description: "Your farmer level, earned through farming experience."
	},
	harvested_crops: {
		label: "Most crops harvested",
		heading: "Crops",
		unit: "crops harvested",
		description: "Lifetime harvest of all crop varieties, including extra yield from water and care."
	},
	badges: {
		label: "Most badges",
		heading: "Badges",
		unit: "badges",
		description: "Crop mastery medals you have claimed. Up to 36 badges to earn."
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
	}
});
function t(t) {
	if (!Object.hasOwn(e, t)) throw Error("Choose a valid leaderboard category.");
	return e[t];
}
var n = "player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_crops,badges,deliveries";
async function r(e, r, i = "currency") {
	t(i);
	let { data: a, error: o } = await e.from("player_stats").select(n).order(i, { ascending: !1 }).order("player_id", { ascending: !0 }).limit(20);
	if (o) throw o;
	let s = a?.find((e) => e.player_id === r) ?? null;
	if (!s && r) {
		let t = await e.from("player_stats").select(n).eq("player_id", r).maybeSingle();
		if (t.error) throw t.error;
		s = t.data;
	}
	let c = null;
	if (s) {
		let t = await e.from("player_stats").select("player_id", {
			count: "exact",
			head: !0
		}).gt(i, s[i]);
		if (t.error) throw t.error;
		c = (t.count ?? 0) + 1;
	}
	return {
		rows: a ?? [],
		own: s,
		rank: c,
		category: i
	};
}
function i(e, n = "currency") {
	t(n);
	let r = 0, i = null;
	return e.map((e, t) => {
		let a = Number(e[n] ?? 0);
		return a !== i && (r = t + 1), i = a, {
			row: e,
			rank: r,
			score: a
		};
	});
}
function a(e, { rows: n, own: r, rank: a, category: s = "currency", onlinePlayers: c = [], presenceReady: l = !1 }, u) {
	let d = t(s);
	if (e.replaceChildren(), !n.length) {
		let t = document.createElement("p");
		t.className = "leaderboard-empty", t.textContent = "The valley is quiet. Be the first farmer on this board.", e.append(t);
		return;
	}
	let f = document.createElement("table");
	f.className = "leaderboard-table";
	let p = document.createElement("caption");
	p.className = "leaderboard-caption", p.textContent = `${d.label} · Top 20`, f.append(p);
	let m = document.createElement("thead"), h = document.createElement("tr");
	for (let e of [
		"Rank",
		"Farmer",
		d.heading
	]) {
		let t = document.createElement("th");
		t.scope = "col", t.textContent = e, h.append(t);
	}
	m.append(h), f.append(m);
	let g = document.createElement("tbody");
	if (i(n, s).forEach(({ row: e, rank: t, score: n }) => {
		let r = document.createElement("tr");
		r.classList.toggle("is-you", e.player_id === u);
		let i = document.createElement("td");
		i.textContent = String(t);
		let a = document.createElement("td"), o = document.createElement("strong"), s = document.createElement("small");
		o.textContent = e.username;
		let c = document.createElement("span");
		c.className = "online-dot", c.dataset.onlinePlayer = e.player_id, c.setAttribute("role", "img"), o.prepend(c), s.textContent = `Level ${e.level}${e.player_id === u ? " · You" : ""}`, a.append(o, s);
		let l = document.createElement("td");
		l.textContent = n.toLocaleString("en-US"), r.append(i, a, l), g.append(r);
	}), f.append(g), e.append(f), o(e, {
		onlinePlayers: c,
		presenceReady: l
	}), r && a) {
		let t = document.createElement("div");
		t.className = "your-rank";
		let n = document.createElement("strong"), i = document.createElement("span");
		n.textContent = `Your rank: #${a}`;
		let o = Number(r[s] ?? 0).toLocaleString("en-US");
		i.textContent = s === "level" ? `Level ${o} · ${r.username}` : `${o} ${d.unit} · ${r.username}`, t.append(n, i), e.append(t);
	}
}
function o(e, { onlinePlayers: t = [], presenceReady: n = !1 }) {
	let r = new Set(t);
	e.querySelectorAll("[data-online-player]").forEach((e) => {
		let t = n && r.has(e.dataset.onlinePlayer);
		e.classList.toggle("is-online", t), e.title = t ? "Online now" : n ? "Not currently online" : "Online status unavailable", e.setAttribute("aria-label", e.title);
	});
}
//#endregion
export { o as i, r as n, a as r, e as t };

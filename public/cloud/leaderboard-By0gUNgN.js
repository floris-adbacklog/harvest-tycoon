//#region src/leaderboard.js
async function e(e, t) {
	let { data: n, error: r } = await e.from("player_stats").select("player_id,username,currency,level").order("currency", { ascending: !1 }).order("player_id", { ascending: !0 }).limit(20);
	if (r) throw r;
	let i = n?.find((e) => e.player_id === t) ?? null;
	if (!i && t) {
		let n = await e.from("player_stats").select("player_id,username,currency,level").eq("player_id", t).maybeSingle();
		if (n.error) throw n.error;
		i = n.data;
	}
	let a = null;
	if (i) {
		let t = await e.from("player_stats").select("player_id", {
			count: "exact",
			head: !0
		}).gt("currency", i.currency);
		if (t.error) throw t.error;
		a = (t.count ?? 0) + 1;
	}
	return {
		rows: n ?? [],
		own: i,
		rank: a
	};
}
function t(e, { rows: t, own: n, rank: r }, i) {
	if (e.replaceChildren(), !t.length) {
		let t = document.createElement("p");
		t.className = "leaderboard-empty", t.textContent = "The valley is quiet. Pick a name and be the first farmer on the board.", e.append(t);
		return;
	}
	let a = document.createElement("table");
	a.className = "leaderboard-table", a.innerHTML = "<thead><tr><th scope=\"col\">Rank</th><th scope=\"col\">Farmer</th><th scope=\"col\">Coins</th></tr></thead>";
	let o = document.createElement("tbody"), s = 0, c = null;
	if (t.forEach((e, t) => {
		c !== e.currency && (s = t + 1), c = e.currency;
		let n = document.createElement("tr");
		n.classList.toggle("is-you", e.player_id === i);
		let r = document.createElement("td");
		r.textContent = String(s);
		let a = document.createElement("td"), l = document.createElement("strong"), u = document.createElement("small");
		l.textContent = e.username, u.textContent = `Level ${e.level}${e.player_id === i ? " · You" : ""}`, a.append(l, u);
		let d = document.createElement("td");
		d.textContent = e.currency.toLocaleString("en-US"), n.append(r, a, d), o.append(n);
	}), a.append(o), e.append(a), n && r) {
		let t = document.createElement("div");
		t.className = "your-rank";
		let i = document.createElement("strong"), a = document.createElement("span");
		i.textContent = `Your rank: #${r}`, a.textContent = `${n.currency.toLocaleString("en-US")} coins · ${n.username}`, t.append(i, a), e.append(t);
	}
}
//#endregion
export { t as n, e as t };

import { i as e, r as t, t as n } from "./leaderboard-BozDYht-.js";
//#region src/ui.js
var r = (e) => document.getElementById(e);
function i({ onOpen: e, onName: t, onRetry: i, onSignIn: a, onRegister: o, onSignOut: s }) {
	let c = document.createElement("button");
	c.id = "leaderboard-button", c.className = "leaderboard-button", c.setAttribute("aria-haspopup", "dialog"), c.innerHTML = "<i data-lucide=\"trophy\"></i><span>Leaderboard</span>", document.querySelector(".tool-dock").append(c);
	let l = document.createElement("div");
	l.innerHTML = `<dialog id="auth-dialog" class="game-dialog auth-dialog" aria-labelledby="auth-title"><div class="auth-brand"><img src="/assets/harvest-tycoon-logo.png" alt="" width="92" height="92"><div><span class="eyebrow">WELCOME BACK TO THE FARM</span><h2 id="auth-title">Save your progress</h2></div></div><p class="section-copy">Sign in to access your coins, level, and player name on any device.</p><div class="auth-tabs" role="tablist"><button type="button" role="tab" data-auth-tab="signin" aria-selected="true">Sign in</button><button type="button" role="tab" data-auth-tab="register" aria-selected="false">Create account</button></div><form id="auth-form"><div id="register-name-row" hidden><label for="auth-username">Player name</label><input id="auth-username" autocomplete="nickname" minlength="3" maxlength="20" placeholder="Sunny Acres"></div><label for="auth-email">Email address</label><input id="auth-email" type="email" autocomplete="email" required placeholder="you@example.com"><label for="auth-password">Password</label><input id="auth-password" type="password" autocomplete="current-password" minlength="6" required><p id="auth-message" class="cloud-form-error" role="status"></p><button id="auth-submit" class="primary-button" type="submit">Sign in<i data-lucide="log-in"></i></button></form><p class="auth-note">Your session stays securely saved in this browser.</p></dialog>
 <dialog id="leaderboard-dialog" class="game-dialog wide-dialog" aria-labelledby="leaderboard-title"><div class="dialog-heading"><div><span class="eyebrow">GROWING TOGETHER</span><h2 id="leaderboard-title">The valley leaderboard</h2></div><button class="icon-button" data-cloud-close aria-label="Close"><i data-lucide="x"></i></button></div><p class="leaderboard-intro">Find your place in the valley. Choose a category to compare your progress. A green dot means the farmer has the game open and visible.</p><div class="cloud-profile"><span id="player-name">Your farmer profile</span><button class="small-button" id="rename-player" hidden>Change name</button><button class="small-button" id="logout-player" hidden>Sign out</button></div><div class="leaderboard-filter"><label for="leaderboard-category">Rank by</label><select id="leaderboard-category" aria-describedby="leaderboard-description">${[["progress", "Farm progress"], ["crops", "Individual crops"]].map(([e, t]) => `<optgroup label="${t}">${Object.entries(n).filter(([, t]) => (t.group ?? "progress") === e).map(([e, t]) => `<option value="${e}">${t.label}</option>`).join("")}</optgroup>`).join("")}</select><p id="leaderboard-description">${n.level.description}</p></div><div class="cloud-sync"><span id="cloud-status" role="status">Connecting…</span><button id="retry-cloud" class="back-button">Refresh</button></div><div id="leaderboard-results" aria-live="polite"></div><p class="cloud-privacy">Your name, online status and public farming achievements appear here. Your diamonds and farm details stay private.</p></dialog>
 <dialog id="username-dialog" class="game-dialog" aria-labelledby="username-title"><div class="dialog-heading"><div><span class="eyebrow">MEET THE OTHER FARMERS</span><h2 id="username-title">What should we call you?</h2></div><button class="icon-button" data-cloud-close aria-label="Keep playing"><i data-lucide="x"></i></button></div><p class="section-copy">Choose the display name other players will see on the leaderboard.</p><form id="username-form"><label for="username-input">Display name</label><input id="username-input" name="username" autocomplete="nickname" minlength="3" maxlength="20" required placeholder="Sunny Acres"><small>3–20 letters, numbers, spaces, underscores or hyphens.</small><p id="username-error" class="cloud-form-error" role="alert"></p><button class="primary-button" type="submit">Join the leaderboard<i data-lucide="arrow-right"></i></button></form></dialog>`, document.body.append(...l.children);
	let u = "signin";
	function d(e) {
		document.querySelectorAll("dialog[open]").forEach((e) => e.close()), r(e).showModal();
	}
	function f(e) {
		u = e, document.querySelectorAll("[data-auth-tab]").forEach((e) => e.setAttribute("aria-selected", String(e.dataset.authTab === u))), r("register-name-row").hidden = u !== "register", r("auth-username").required = u === "register", r("auth-password").autocomplete = u === "register" ? "new-password" : "current-password", r("auth-submit").innerHTML = u === "register" ? "Create account<i data-lucide=\"user-plus\"></i>" : "Sign in<i data-lucide=\"log-in\"></i>", r("auth-message").textContent = "", window.lucide?.createIcons();
	}
	function p(e = "") {
		r("username-input").value = e, r("username-error").textContent = "", d("username-dialog"), r("username-input").focus();
	}
	return document.querySelectorAll("[data-cloud-close]").forEach((e) => e.onclick = () => e.closest("dialog").close()), document.querySelectorAll("[data-auth-tab]").forEach((e) => e.onclick = () => f(e.dataset.authTab)), c.onclick = () => {
		d("leaderboard-dialog"), e();
	}, r("retry-cloud").onclick = i, r("leaderboard-category").onchange = () => {
		r("leaderboard-description").textContent = n[r("leaderboard-category").value].description, e();
	}, r("rename-player").onclick = () => p(r("player-name").dataset.username ?? ""), r("logout-player").onclick = s, r("auth-form").onsubmit = async (e) => {
		e.preventDefault();
		let t = r("auth-submit");
		t.disabled = !0, r("auth-message").textContent = u === "register" ? "Creating your account…" : "Signing in…";
		try {
			if (u === "signin") await a(r("auth-email").value, r("auth-password").value);
			else if ((await o(r("auth-email").value, r("auth-password").value, r("auth-username").value)).confirmationRequired) {
				r("auth-message").textContent = "Check your inbox and confirm your email address. You will be signed in automatically afterward.";
				return;
			}
			r("auth-dialog").close();
		} catch (e) {
			r("auth-message").textContent = e.message;
		} finally {
			t.disabled = !1;
		}
	}, r("username-form").onsubmit = async (n) => {
		n.preventDefault();
		let i = n.currentTarget.querySelector("[type=\"submit\"]");
		i.disabled = !0, r("username-error").textContent = "";
		try {
			await t(r("username-input").value), d("leaderboard-dialog"), await e();
		} catch (e) {
			r("username-error").textContent = e.message;
		} finally {
			i.disabled = !1;
		}
	}, window.lucide?.createIcons(), {
		promptName: p,
		requireAuth() {
			r("auth-dialog").open || d("auth-dialog");
		},
		authenticated() {
			r("auth-dialog").open && r("auth-dialog").close();
		},
		configurationError() {
			d("auth-dialog"), r("auth-message").textContent = "The account connection has not been configured yet.";
		},
		authMessage(e) {
			r("auth-dialog").open && (r("auth-message").textContent = e);
		},
		setProfile(e, t) {
			r("player-name").textContent = e ? e.username : "Pick your farmer name", r("player-name").dataset.username = e?.username ?? "", r("rename-player").hidden = !t, r("logout-player").hidden = !t;
		},
		status(e) {
			r("cloud-status").textContent = e;
		},
		message(e) {
			let t = document.createElement("p");
			t.className = "leaderboard-empty", t.textContent = e, r("leaderboard-results").replaceChildren(t);
		},
		get category() {
			return r("leaderboard-category").value;
		},
		get results() {
			return r("leaderboard-results");
		},
		get open() {
			return r("leaderboard-dialog").open;
		}
	};
}
//#endregion
//#region public/visual-icons.js
var a = [
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
], o = {
	"family-weekly-order": "family-weekly-order",
	"family-members": "family-members",
	"family-tournament": "family-tournament",
	"family-management": "family-management",
	familyhall: "farmhouse",
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
	"weeds",
	"troughs",
	"sorting",
	"fences",
	"irrigation",
	"harvestfair"
]) o[`chore-${e}`] = `chore-${e}`;
for (let e of [
	"greenhouse",
	"apiary",
	"paddock",
	"workshop"
]) o[`activity-${e}`] = `activity-${e}`;
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
]) o[e] = e;
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
]) o[e] = e;
var s = new Set([
	"guide",
	"sound",
	"streak"
]);
for (let e of s) o[e] = e;
var c = Object.fromEntries(a.flatMap((e) => e.keys.map((t, n) => [t, {
	...e,
	index: n
}])));
Object.freeze([...Object.keys(c), ...Object.keys(o)]);
function l(e, t = "") {
	let n = c[e];
	if (n) {
		let { file: r, columns: i, index: a } = n, o = a % i / (i - 1) * 100, s = Math.floor(a / i) / (i - 1) * 100;
		return `<span class="game-art game-art-sprite ${t}" data-art="${e}" aria-hidden="true" style="--art-sheet:url('/assets/icons/${r}');--art-size:${i * 100}%;--art-position:${o}% ${s}%"></span>`;
	}
	return o[e] ? `<img class="game-art ${t}" data-art="${e}" src="/assets/icons/${o[e]}.${s.has(e) ? "svg" : "png"}" alt="" draggable="false">` : "";
}
//#endregion
//#region src/payment-ui.js
function u(e) {
	let t = e.paymentReturn?.();
	if (!t?.id) return;
	let n = document.createElement("dialog");
	n.className = "payment-dialog", n.setAttribute("aria-labelledby", "payment-result-title"), n.setAttribute("aria-describedby", "payment-result-message"), n.innerHTML = `<button type="button" class="payment-dismiss" aria-label="Close purchase update"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button><div class="payment-hero">${l("diamonds")}</div><p class="payment-eyebrow">A LITTLE EXTRA GROWING POWER</p><h2 id="payment-result-title">Checking your purchase</h2><p id="payment-result-message" class="payment-message" role="status" aria-live="polite">Just a moment while we check your payment.</p><span class="payment-status">Checking payment</span><div class="payment-actions"><button type="button" data-close autofocus>Back to farm</button><button type="button" data-retry>Check payment</button></div>`, document.body.append(n);
	let r = n.querySelector("h2"), i = n.querySelector(".payment-message"), a = n.querySelector(".payment-status"), o = n.querySelector("[data-retry]"), s, c = 0, u = !1, d = !1, f = () => {
		u = !0, clearTimeout(s);
	};
	n.addEventListener("close", () => {
		f(), window.removeEventListener("pagehide", f), e.clearPaymentReturn?.(), n.remove();
	}), window.addEventListener("pagehide", f, { once: !0 }), n.querySelector("[data-close]").onclick = () => n.close(), n.querySelector(".payment-dismiss").onclick = () => n.close();
	function p(e, t, o, s) {
		n.dataset.state = e, r.textContent = t, i.textContent = o, a.textContent = s;
	}
	async function m() {
		if (!(u || d)) {
			d = !0, clearTimeout(s), o.disabled = !0, o.textContent = "Checking…";
			try {
				let n = await e.payments({
					operation: "status",
					purchaseId: t.id
				});
				if (u) return;
				if (n.status === "credited") {
					p("credited", n.pack === "starter" ? "Your Starter Pack is here!" : "A little sparkle for your farm", n.pack === "starter" ? "10,000 coins, 300 diamonds and one of every crop have been added to your account." : `${Number(n.diamonds).toLocaleString("en-US")} diamonds have been added to your farm. Enjoy your next little upgrade!`, "Payment confirmed"), o.hidden = !0, window.dispatchEvent(new Event("harvest-purchase-confirmed"));
					try {
						await window.harvestRefresh?.();
					} catch {
						u || (i.textContent += " Reopen your farm to refresh your balance.");
					}
					return;
				}
				if (n.status === "test_paid") {
					p("test", "Test payment confirmed", "This was a test purchase. No real diamonds were added.", "Test complete"), o.hidden = !0;
					return;
				}
				if (n.status === "expired") {
					p("closed", "This checkout has expired", "You can return to the diamond shop to start a new checkout.", "Checkout expired"), o.hidden = !0;
					return;
				}
				t.cancelled ? p("closed", "Back to your farm", "Checkout was closed. If you paid before returning, check your payment status below.", "Checkout closed") : p("pending", "Confirming your purchase", "We’re waiting for payment confirmation. You can return to your farm while we check.", "Awaiting confirmation"), !t.cancelled && ++c < 20 && (s = setTimeout(m, 3e3));
			} catch {
				u || p("error", "Let’s check again", "We couldn’t confirm your payment right now. If you paid, check again in a moment.", "Connection interrupted");
			} finally {
				d = !1, o.disabled = !1, o.textContent = "Check payment";
			}
		}
	}
	o.onclick = () => {
		c = 0, m();
	}, n.showModal(), m();
}
//#endregion
//#region src/starter-pack-ui.js
async function d(e) {
	let { CROPS: t, formatDuration: n } = await import(
		/* @vite-ignore */
		"/farm-state.js"
), { art: r, refreshArt: i } = await import(
		/* @vite-ignore */
		"/visual-icons.js"
), a = document.createElement("link");
	a.rel = "stylesheet", a.href = "/starter-pack.css", document.head.append(a);
	let o = document.createElement("button");
	o.id = "starter-pack-button", o.hidden = !0, o.type = "button", o.setAttribute("aria-label", "Starter Pack, €2.99"), o.innerHTML = "<img src=\"/assets/icons/starter-pack.svg\" alt=\"\"><span>Starter Pack</span><small>€2.99</small>";
	let s = document.createElement("dialog");
	s.id = "starter-pack-dialog", s.className = "game-dialog", s.setAttribute("aria-labelledby", "starter-pack-title"), s.innerHTML = `<button type="button" class="starter-close" aria-label="Close Starter Pack">×</button><img class="starter-hero" src="/assets/icons/starter-pack.svg" alt=""><span class="eyebrow">A LITTLE HEAD START</span><h2 id="starter-pack-title">Starter Pack</h2><p>Make yourself at home with a one-time welcome bundle.</p><div class="starter-rewards"><div>${r("coins")}<strong>10,000</strong><span>coins</span></div><div>${r("diamonds")}<strong>300</strong><span>diamonds</span></div></div><h3>1× each of all 12 crops</h3><div class="starter-crops">${Object.entries(t).map(([e, t]) => `<div>${r(e)}<span>${t.name}</span><b>×1</b></div>`).join("")}</div><p class="starter-note">All crops are added to your inventory, ready to use or sell; no fields are planted.</p><p class="starter-time"></p><button class="primary-button starter-buy" disabled>Buy Starter Pack · €2.99</button><p class="starter-feedback" role="status" aria-live="polite"></p><small>One purchase per account. Available for your first 72 hours.</small>`, document.body.append(o, s), i();
	let c = s.querySelector(".starter-buy"), l = s.querySelector(".starter-feedback"), u = s.querySelector(".starter-time"), d = null, f = 0, p = !1, m = !1, h = "", g = !1;
	function _() {
		let e = d?.starter, t = (e?.expiresAt ?? 0) - (Date.now() + f), r = e?.eligible && t > 0;
		o.hidden = !r, c.disabled = p || !r || !d?.enabled, c.textContent = p ? "Opening secure checkout…" : d?.mode === "test" ? "Test Starter Pack · €2.99" : "Buy Starter Pack · €2.99", u.textContent = e?.claimed ? "Starter Pack already received" : r ? `Available for ${n(t)}` : "This welcome offer has ended.", !d?.enabled && !p ? l.textContent = "Purchases are not available yet. Please check back later." : d?.enabled && l.textContent === "Purchases are not available yet. Please check back later." && (l.textContent = "");
	}
	async function v() {
		if (!(g || m)) {
			g = !0;
			try {
				let t = await e.payments({ operation: "catalog" });
				if (m) return;
				d = t, f = t.serverNow - Date.now(), _();
			} catch {
				d || (o.hidden = !0);
			} finally {
				g = !1;
			}
		}
	}
	o.onclick = () => {
		document.querySelectorAll("dialog[open]").forEach((e) => e.close()), h = crypto.randomUUID(), l.textContent = "", _(), s.showModal(), v();
	}, s.querySelector(".starter-close").onclick = () => s.close(), c.onclick = async () => {
		if (!(p || c.disabled)) {
			p = !0, l.textContent = "", _();
			try {
				await e.checkout("starter", h);
			} catch (e) {
				l.textContent = e.message, p = !1, _();
			}
		}
	};
	let y = setInterval(_, 1e4), b = setInterval(v, 6e4), x = () => {
		document.hidden || v();
	};
	document.addEventListener("visibilitychange", x), window.addEventListener("harvest-purchase-confirmed", v), window.addEventListener("pagehide", () => {
		m = !0, clearInterval(y), clearInterval(b), document.removeEventListener("visibilitychange", x), window.removeEventListener("harvest-purchase-confirmed", v);
	}, { once: !0 }), await v();
}
//#endregion
//#region src/game-cloud.js
var f;
try {
	f = window.parent === window ? null : window.parent.harvestBridge;
} catch {}
if (!f) location.replace("/play.html");
else if (window.harvestInitialFarm = f.takeInitial(), !window.harvestInitialFarm) location.replace("/play.html");
else {
	document.body.hidden = !1;
	let n = i({
		onOpen: s,
		onRetry: s,
		onName: async (e) => {
			let t = await f.request({
				operation: "rename",
				username: e
			});
			n.setProfile(t.profile, { id: f.playerId });
		},
		onSignOut: () => f.signOut()
	});
	n.setProfile(window.harvestInitialFarm.profile, { id: f.playerId }), n.status("Live rankings");
	let r = f.presence?.subscribe((t) => {
		n.open && e(n.results, t);
	}), a = setInterval(() => {
		n.open && !document.hidden && s(!0);
	}, 3e4);
	window.addEventListener("pagehide", () => {
		r?.(), clearInterval(a);
	}, { once: !0 });
	let o = 0;
	async function s(e = !1) {
		let r = ++o, i = n.category;
		e || n.message("Gathering the latest scores…"), n.results.setAttribute("aria-busy", "true");
		try {
			let e = await f.leaderboard(i);
			if (r !== o) return;
			t(n.results, e, f.playerId), n.status("Up to date");
		} catch (t) {
			r === o && (e || n.message(t.message), n.status("Could not refresh"));
		} finally {
			r === o && n.results.setAttribute("aria-busy", "false");
		}
	}
	let { farmReady: c } = await import(
		/* @vite-ignore */
		"/game.js"
);
	await c && (u(f), await d(f));
}
//#endregion

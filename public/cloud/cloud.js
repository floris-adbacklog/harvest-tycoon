import { a as e, c as t, d as n, f as r, i, l as a, n as o, o as s, r as c, s as l, t as u, u as ee } from "./supabase-CrOKe3zT.js";
import { n as te } from "./leaderboard-Dwg4Bo_W.js";
function ne(e, t = Date.now()) {
	let n = Date.parse(e), r = t - n;
	return Number.isFinite(n) && r >= 0 && r < 18e5;
}
function re(e, t, n = globalThis.document, r = globalThis.window, i = Date.now) {
	let a = [], o = !1, s = 0, c = /* @__PURE__ */ new Set(), l = () => ({
		onlinePlayers: a.filter((e) => ne(e.last_active_at, i() + s)).map((e) => e.player_id),
		presenceReady: o
	}), u = () => {
		for (let e of c) try {
			e(l());
		} catch {}
	}, ee = r.setInterval(() => u(), 1e3);
	return {
		snapshot: l,
		setClock(e) {
			Number.isFinite(e) && (s = e - i());
		},
		setRows(e) {
			a = e, o = !0, u();
		},
		subscribe(e) {
			return c.add(e), e(l()), () => c.delete(e);
		},
		dispose() {
			r.clearInterval(ee), c.clear(), a = [], o = !1;
		}
	};
}
//#endregion
//#region src/analytics.js
function d(e, t = {}, n = globalThis.window) {
	n && (n.dataLayer = n.dataLayer || []).push({
		event: e,
		...t
	});
}
function ie(e) {
	let t = e?.user?.identities;
	return !Array.isArray(t) || t.length > 0;
}
function f(e = globalThis.window) {
	let t = e?.innerWidth ?? 0;
	return t && t < 768 ? "mobile" : t && t < 1100 ? "tablet" : "desktop";
}
var ae = [
	"mode",
	"field",
	"reason",
	"method",
	"after_signup"
];
function p(e, t = {}, n = globalThis.window) {
	let r = { device: f(n) };
	for (let e of ae) {
		let n = t[e];
		(typeof n == "boolean" || typeof n == "string" && /^[a-z0-9_]{1,32}$/.test(n)) && (r[e] = n);
	}
	d(`auth_${e}`, r, n);
}
function oe({ confirmationRequired: e = !1 } = {}, t) {
	d("sign_up", {
		method: "email",
		email_confirmation_required: !!e
	}, t);
}
var se = new Set([
	"diamond_shop_view",
	"diamond_pack_started",
	"diamond_pack_completed",
	"diamond_action_completed",
	"vip_purchase_started",
	"vip_purchase_completed",
	"vip_extended",
	"vip_expired"
]), ce = {
	pack: new Set([
		"50",
		"100",
		"150",
		"300",
		"500",
		"600",
		"1000",
		"1250",
		"2000",
		"3500",
		"starter"
	]),
	plan: new Set(["week", "month"]),
	action: new Set([
		"finish_crop",
		"finish_batch",
		"xp",
		"coins",
		"crops",
		"production",
		"upgrade",
		"replace_order"
	])
};
function le(e, t = {}, n = globalThis.window) {
	if (!se.has(e)) return;
	let r = { device: f(n) };
	for (let [e, n] of Object.entries(ce)) n.has(t[e]) && (r[e] = t[e]);
	for (let e of ["cost", "diamonds"]) Number.isSafeInteger(t[e]) && t[e] >= 0 && t[e] <= 1e4 && (r[e] = t[e]);
	d(e, r, n);
}
var ue = new Set([
	"game_session",
	"level_up",
	"guide_step",
	"guide_complete",
	"reminder_prompt",
	"connection_problem",
	"connection_recovered"
]), de = new Set([
	"harvest",
	"sell",
	"plant",
	"water",
	"produce",
	"gift",
	"chore",
	"sell_egg",
	"tend",
	"wheat",
	"collect"
]), fe = new Set([
	"shown",
	"accepted",
	"dismissed",
	"failed"
]), pe = new Set([
	"offline",
	"timeout",
	"network",
	"server",
	"other"
]), me = new Set(["reconnecting", "paused"]);
function he(e, t = {}, n = globalThis.window) {
	if (!ue.has(e)) return;
	let r = { device: f(n) };
	Number.isSafeInteger(t.level) && t.level >= 1 && t.level <= 500 && (r.level = t.level), Number.isSafeInteger(t.index) && t.index >= 0 && t.index <= 9 && (r.index = t.index), de.has(t.step) && (r.step = t.step), fe.has(t.action) && (r.action = t.action), typeof t.returning == "boolean" && (r.returning = t.returning), pe.has(t.reason) && (r.reason = t.reason), me.has(t.stage) && (r.stage = t.stage), d(e, r, n);
}
var ge = "Use 3–20 letters, numbers, spaces, underscores or hyphens.", _e = Object.freeze({
	signin: {
		eyebrow: "GOOD TO SEE YOU, FARMER",
		title: "Welcome home.",
		copy: "Sign in to pick up where you left off.",
		submit: "Sign in & play",
		fields: ["email", "password"],
		tabs: !0,
		switch: {
			text: "New here?",
			label: "Create account",
			to: "register"
		}
	},
	register: {
		eyebrow: "NEW FARMERS WELCOME",
		title: "Start your farm.",
		copy: "Your first harvest is just around the corner.",
		submit: "Start my farm",
		fields: ["email", "password"],
		tabs: !0,
		switch: {
			text: "Already have an account?",
			label: "Sign in",
			to: "signin"
		}
	},
	name: {
		eyebrow: "ALMOST THERE",
		title: "Meet your farmer.",
		copy: "Choose the name other farmers will see.",
		submit: "Open my farm",
		fields: ["name"],
		tabs: !1,
		switch: null
	},
	forgot: {
		eyebrow: "NO WORRIES",
		title: "Forgot your password?",
		copy: "Enter your email and we’ll send you a link to choose a new one.",
		submit: "Send reset link",
		fields: ["email"],
		tabs: !1,
		switch: {
			text: "",
			label: "← Back to sign in",
			to: "signin"
		}
	},
	recovery: {
		eyebrow: "ALMOST BACK IN",
		title: "Choose a new password.",
		copy: "Then we’ll open your farm.",
		submit: "Save & play",
		fields: ["password"],
		tabs: !1,
		switch: null
	},
	confirm: {
		eyebrow: "ONE LAST STEP",
		title: "Check your inbox.",
		copy: "",
		submit: "",
		fields: [],
		tabs: !1,
		switch: null
	}
}), ve = [
	"Sunny",
	"Happy",
	"Golden",
	"Cozy",
	"Merry",
	"Breezy",
	"Lucky",
	"Bright",
	"Gentle",
	"Rustic"
], ye = [
	"Acres",
	"Meadow",
	"Orchard",
	"Barn",
	"Fields",
	"Hollow",
	"Valley",
	"Harvest",
	"Creek",
	"Farm"
];
function be(e = Math.random) {
	let t = (t) => t[Math.floor(e() * t.length) % t.length];
	return `${t(ve)} ${t(ye)} ${1e3 + Math.floor(e() * 9e3)}`;
}
var xe = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e ?? "").trim());
function Se({ mode: e, name: t = "", email: n = "", password: r = "" }, i) {
	let a = {};
	return (e === "name" || e === "register" && t.trim() !== "") && !i(t) && (a.name = ge), [
		"signin",
		"register",
		"forgot"
	].includes(e) && !xe(n) && (a.email = "Enter a valid email address, like you@example.com."), e === "signin" && !r && (a.password = "Enter your password."), (e === "register" || e === "recovery") && r.length < 6 && (a.password = "Use at least 6 characters."), a;
}
function Ce(e, t = (e) => e?.message) {
	let n = e?.code, r = e?.status, i = String(e?.message ?? "");
	return n === "weak_password" ? {
		field: "password",
		reason: "weak_password",
		message: "Choose a stronger password: at least 6 characters and not a common one."
	} : n === "user_already_exists" || n === "email_exists" ? {
		field: "email",
		reason: "email_exists",
		message: "This email already has an account. Try signing in instead."
	} : n === "email_address_invalid" || n === "validation_failed" ? {
		field: "email",
		reason: "invalid_email",
		message: "That email address does not look right. Please check it."
	} : n === "over_email_send_rate_limit" || n === "over_request_rate_limit" || r === 429 ? {
		reason: "rate_limited",
		message: "Too many attempts. Please wait a few minutes and try again."
	} : n === "invalid_credentials" ? {
		reason: "invalid_credentials",
		message: "The email address or password is incorrect."
	} : n === "email_not_confirmed" ? {
		reason: "email_not_confirmed",
		resend: !0,
		message: "Please confirm your email first. Use the link in your inbox, or send it again."
	} : n === "same_password" ? {
		field: "password",
		reason: "same_password",
		message: "Choose a password you have not used before."
	} : /failed to fetch|networkerror|load failed|network request failed/i.test(i) ? {
		reason: "network",
		message: "We could not reach the server. Check your connection and try again."
	} : {
		reason: "other",
		message: t(e) || "Something went wrong. Please try again."
	};
}
//#endregion
//#region src/pwa.js
function we({ standalone: e = !1, ios: t = !1, promptReady: n = !1, secure: r = !0, serviceWorker: i = !0 } = {}) {
	return e ? { kind: "installed" } : !r || !i ? { kind: "unsupported" } : n ? { kind: "prompt" } : { kind: t ? "ios" : "manual" };
}
function Te(e = globalThis.window) {
	if (!e?.navigator) return null;
	let t = e.navigator, n = /* @__PURE__ */ new Set(), r = null, i = () => !!(e.matchMedia?.("(display-mode: standalone)")?.matches || t.standalone), a = () => /iphone|ipad|ipod/i.test(t.userAgent ?? "") || t.platform === "MacIntel" && t.maxTouchPoints > 1, o = () => we({
		standalone: i(),
		ios: a(),
		promptReady: !!r,
		secure: e.isSecureContext !== !1,
		serviceWorker: "serviceWorker" in t
	}), s = () => {
		for (let e of n) try {
			e(o());
		} catch {}
	};
	if (e.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault(), r = e, s();
	}), e.addEventListener("appinstalled", () => {
		r = null, d("pwa_installed", {}, e), s();
	}), "serviceWorker" in t) {
		let n = () => t.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
		e.document?.readyState === "complete" ? n() : e.addEventListener("load", n);
	}
	i() && d("pwa_launch", {}, e);
	let c = {
		state: o,
		subscribe(e) {
			return n.add(e), () => n.delete(e);
		},
		async install() {
			if (!r) return { outcome: "unavailable" };
			let t = r;
			r = null, d("pwa_install_click", {}, e), await t.prompt();
			let n = await t.userChoice;
			return s(), n;
		}
	};
	return e.harvestPwa = c, c;
}
//#endregion
//#region src/push.js
function Ee(e) {
	let t = (e + "=".repeat((4 - e.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/"), n = atob(t);
	return Uint8Array.from(n, (e) => e.charCodeAt(0));
}
function De({ supabase: e, getKey: t, win: n = globalThis.window }) {
	let r = n?.navigator, i = !!(r && "serviceWorker" in r && n && "PushManager" in n && "Notification" in n), a = () => !!(n?.matchMedia?.("(display-mode: standalone)")?.matches || r?.standalone), o = () => /iphone|ipad|ipod/i.test(r?.userAgent ?? "") || r?.platform === "MacIntel" && r?.maxTouchPoints > 1, s = async () => {
		try {
			return await r.serviceWorker.ready;
		} catch {
			return null;
		}
	}, c = async () => (await s())?.pushManager?.getSubscription() ?? null;
	async function l(t) {
		let n = t.toJSON(), { error: i } = await e.rpc("notification_subscribe", {
			p_endpoint: n.endpoint,
			p_p256dh: n.keys?.p256dh,
			p_auth: n.keys?.auth,
			p_user_agent: (r.userAgent ?? "").slice(0, 300)
		});
		if (i) throw i;
	}
	async function u() {
		return i ? o() && !a() ? { kind: "install-first" } : n.Notification.permission === "denied" ? { kind: "blocked" } : { kind: n.Notification.permission === "granted" && await c() ? "on" : "off" } : { kind: "unsupported" };
	}
	return {
		status: u,
		async enable() {
			let e = await u();
			if (e.kind === "unsupported" || e.kind === "install-first" || e.kind === "blocked") return e;
			let r = await t();
			if (!r) throw Error("Reminders are not switched on yet.");
			if (await n.Notification.requestPermission() !== "granted") return u();
			let i = await s();
			if (!i) throw Error("The app is not ready yet. Reload the page and try again.");
			return await l(await i.pushManager.getSubscription() ?? await i.pushManager.subscribe({
				userVisibleOnly: !0,
				applicationServerKey: Ee(r)
			})), u();
		},
		async disable() {
			let t = await c();
			if (t) {
				try {
					await e.rpc("notification_unsubscribe", { p_endpoint: t.endpoint });
				} catch {}
				await t.unsubscribe().catch(() => {});
			}
			return u();
		},
		async sync() {
			try {
				if ((await u()).kind === "on") {
					let e = await c();
					e && await l(e);
				}
			} catch {}
		},
		async detach() {
			try {
				let t = n.Notification?.permission === "granted" ? await c() : null;
				t && await e.rpc("notification_unsubscribe", { p_endpoint: t.endpoint });
			} catch {}
		},
		async test() {
			let e = await s();
			if (!e) throw Error("The app is not ready yet.");
			await e.showNotification("Harvest Tycoon", {
				body: "Notifications work in this browser or app. We will only nudge you when your farm needs you.",
				icon: "/assets/pwa/icon-192.png",
				tag: "harvest-tycoon-test"
			});
		}
	};
}
//#endregion
//#region src/notifications.js
var m = Object.freeze({
	pushCrops: !1,
	pushProduction: !1,
	pushDaily: !1,
	emailDigest: !1,
	digestHour: 9
});
function h() {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
}
var g = (e) => Number.isInteger(e) && e >= 0 && e <= 23;
function Oe(e) {
	return e ? {
		pushCrops: e.push_crops === !0,
		pushProduction: e.push_production === !0,
		pushDaily: e.push_daily === !0,
		emailDigest: e.email_digest === !0,
		digestHour: g(e.digest_hour) ? e.digest_hour : m.digestHour
	} : { ...m };
}
function ke(e, t = h()) {
	let n = Number(e.digestHour);
	return {
		p_push_crops: e.pushCrops === !0,
		p_push_production: e.pushProduction === !0,
		p_push_daily: e.pushDaily === !0,
		p_email_digest: e.emailDigest === !0,
		p_digest_hour: g(n) ? n : m.digestHour,
		p_timezone: t
	};
}
function Ae(e, { configUrl: t = null, fetchImpl: n = globalThis.fetch, timezone: r = h, win: i = globalThis.window } = {}) {
	let a = !1, o = null, s = (async () => {
		if (!(!t || typeof n != "function")) try {
			let e = await n(t);
			if (!e.ok) return;
			let r = await e.json();
			r?.enabled === !0 && (a = !0, o = r);
		} catch {}
	})(), c = De({
		supabase: e,
		getKey: async () => (await s, o?.vapidPublicKey ?? null),
		win: i
	});
	return {
		ready: s,
		get available() {
			return a;
		},
		get config() {
			return o;
		},
		get push() {
			return o?.push ? c : null;
		},
		async get() {
			let { data: t, error: n } = await e.from("notification_settings").select("push_crops,push_production,push_daily,email_digest,digest_hour").maybeSingle();
			if (n) throw n;
			return Oe(t);
		},
		async save(t) {
			let n = ke(t, r()), { error: i } = await e.rpc("notification_save", n);
			if (i) throw i;
			return {
				pushCrops: n.p_push_crops,
				pushProduction: n.p_push_production,
				pushDaily: n.p_push_daily,
				emailDigest: n.p_email_digest,
				digestHour: n.p_digest_hour
			};
		}
	};
}
//#endregion
//#region src/player-counts.js
var je = (e) => String(e).replace(/\B(?=(\d{3})+(?!\d))/g, " "), Me = ({ players: e, online: t }) => ({
	players: `${je(e)} ${e === 1 ? "player" : "players"}`,
	online: `${je(t)} online`
});
async function Ne(e, t = globalThis.fetch) {
	if (!e || typeof t != "function") return null;
	let n = await t(`${e}/player-counts`);
	if (!n.ok) return null;
	let r = await n.json();
	return Number.isSafeInteger(r?.players) && Number.isSafeInteger(r?.online) && r.players >= 0 && r.online >= 0 && r.online <= r.players ? {
		players: r.players,
		online: r.online
	} : null;
}
function Pe({ functionsUrl: e, doc: t = globalThis.document, fetchImpl: n = globalThis.fetch, interval: r = 6e4, timers: i = globalThis } = {}) {
	let a = t?.getElementById?.("player-counts");
	if (!a || !e) return () => {};
	let o = !1, s = null, c = (e) => {
		let t = Me(e);
		a.querySelector("[data-count=\"players\"]").textContent = t.players, a.querySelector("[data-count=\"online\"]").textContent = t.online, a.hidden = !1;
	}, l = async () => {
		if (!(o || t.body?.dataset?.phase === "authenticated")) {
			if (!t.hidden) try {
				let t = await Ne(e, n);
				t && !o && c(t);
			} catch {}
			o || (s = i.setTimeout(l, r));
		}
	};
	return l(), () => {
		o = !0, i.clearTimeout?.(s);
	};
}
//#endregion
//#region src/main.js
var _ = (e) => document.getElementById(e);
Te(), Pe({ functionsUrl: c });
var v = null, y = null, b = "register", x = 0, S = null, C = null, w = !1, T = !1, E = !1, D = !1, O = !1, k = !1, A = !1, j = "signup", M = "", N = null, P = {}, F = /* @__PURE__ */ new Set(), I = n({
	isOnline: () => navigator.onLine,
	isHidden: () => document.hidden,
	track: (e, t) => he(e, t),
	probe: Ye,
	onStatus: (e, { reason: t }) => {
		for (let t of F) t(e);
		e === "paused" && Y(ee(t, navigator.onLine), { retrying: !0 });
	},
	onRecovered: (e) => {
		e === "paused" ? Z() : C?.contentWindow?.harvestRefresh?.();
	}
}), Fe = "harvest-tycoon:auth", L = "harvest-tycoon:returning", R = "harvest-tycoon:confirm-pending", z = {
	get(e) {
		try {
			return localStorage.getItem(e);
		} catch {
			return null;
		}
	},
	set(e, t) {
		try {
			localStorage.setItem(e, t);
		} catch {}
	},
	remove(e) {
		try {
			localStorage.removeItem(e);
		} catch {}
	}
}, Ie = () => {
	try {
		return localStorage.getItem(Fe) === null && localStorage.getItem(L) === null;
	} catch {
		return !1;
	}
}, Le = () => z.get(L) === "1" || z.get(Fe) !== null, Re = () => `${globalThis.location?.hash ?? ""}&${globalThis.location?.search ?? ""}`, ze = () => /type=(recovery|signup|magiclink|invite|email_change)/.exec(Re())?.[1] ?? "", Be = () => /error_code=|error=access_denied/.test(Re()), B = () => new URL("/play.html", location.origin).href, V = (e) => e === "name" ? "player-name" : e, Ve = {
	register: "Creating your account…",
	signin: "Opening your farm…",
	name: "Opening your farm…",
	forgot: "Sending your link…",
	recovery: "Saving your password…"
};
function H(e, t) {
	document.body.dataset.phase = e, _("loading-screen").hidden = e !== "checking", _("welcome").hidden = e === "checking" || e === "authenticated", _("farm-host").hidden = e !== "authenticated", t && (_("loading-copy").textContent = t);
}
function U() {
	v?.dispose(), v = null, F.clear(), x++, C?.remove(), C = null, S = null, delete window.harvestBridge, _("farm-host").replaceChildren();
}
function W(e, t) {
	D = !0;
	try {
		_(e).focus(t);
	} finally {
		D = !1;
	}
}
function G(e, t = "") {
	_(e + "-error").textContent = t, _(V(e)).setAttribute("aria-invalid", String(!!t));
}
function K() {
	for (let e of [
		"email",
		"password",
		"name"
	]) G(e);
}
function He(e) {
	K();
	for (let [t, n] of Object.entries(e)) G(t, n);
	let t = Object.keys(e)[0];
	t && W(V(t));
}
function Ue(e) {
	_("password").type = e ? "text" : "password", _("toggle-password").textContent = e ? "Hide" : "Show", _("toggle-password").setAttribute("aria-label", e ? "Hide password" : "Show password"), _("toggle-password").setAttribute("aria-pressed", String(e));
}
function We(e) {
	_("account-submit").disabled = e, document.querySelectorAll("[data-mode]").forEach((t) => t.disabled = e);
}
function q(e, t = !1) {
	b = e;
	let n = _e[b];
	b !== "register" && (O = !1);
	let r = (e) => n.fields.includes(e) || e === "name" && b === "register" && O, i = [
		"email",
		"password",
		"name"
	].filter(r);
	for (let e of [
		"email",
		"password",
		"name"
	]) _(e + "-row").hidden = !r(e), _(V(e)).required = r(e) && (e !== "name" || b === "name"), _(V(e)).setAttribute("enterkeyhint", e === i.at(-1) ? "go" : "next");
	K(), Ue(!1), _("password").autocomplete = b === "signin" ? "current-password" : "new-password", _("form-eyebrow").textContent = n.eyebrow, _("account-title").textContent = n.title, _("account-copy").textContent = n.copy, _("account-copy").hidden = !n.copy, _("account-submit").textContent = n.submit, _("account-message").textContent = "", _("account-form").hidden = b === "confirm", _("confirm-panel").hidden = b !== "confirm", _("connection-actions").hidden = !0, document.querySelector(".account-tabs").hidden = !n.tabs, _("forgot-link").hidden = b !== "signin", _("name-toggle").hidden = !(b === "register" && !O), _("name-optional").hidden = b === "name", _("name-help").hidden = b === "name", _("register-promise").hidden = b !== "register", _("mode-switch-row").hidden = !n.switch, n.switch && (_("mode-switch-text").textContent = n.switch.text, _("mode-switch").textContent = n.switch.label, _("mode-switch").dataset.mode = n.switch.to), document.querySelectorAll(".account-tabs [data-mode]").forEach((e) => e.setAttribute("aria-pressed", String(e.dataset.mode === b))), t && (document.querySelector(".account-card").scrollIntoView({
		behavior: "smooth",
		block: "start"
	}), i.length && W(V(i[0]), { preventScroll: !0 }));
}
function J(e = "") {
	I.stop(), U(), q(e || Le() ? "signin" : "register"), H("unauthenticated"), _("account-message").textContent = e, A || (A = !0, p("view", { mode: b }));
}
function Y(e = "Your farm is safe. Reconnect to continue.", { retrying: t = !1 } = {}) {
	U(), H("error"), _("account-title").textContent = "A little pause.", _("account-copy").hidden = !1, _("account-copy").textContent = e, _("account-message").textContent = t ? "We are trying again automatically." : "", _("account-form").hidden = !0, _("confirm-panel").hidden = !0, _("mode-switch-row").hidden = !0, document.querySelector(".account-tabs").hidden = !0, _("connection-actions").hidden = !1;
}
async function Ge() {
	if (!s) {
		J();
		return;
	}
	I.stop();
	try {
		await y?.push?.detach();
	} catch {}
	y = null, U(), H("checking", "Signing you out…");
	try {
		let e = await s.auth.signOut();
		if (e.error) throw e.error;
	} catch {
		await s.auth.signOut({ scope: "local" });
	} finally {
		J(), _("password").value = "";
	}
}
function X(e, { kind: t = "signup", fresh: n = !0 } = {}) {
	M = e, j = t, t === "signup" && z.set(R, "1"), q("confirm"), _("confirm-copy").textContent = t === "reset" ? `If ${e} has an account, a link to choose a new password is on its way.` : n ? `We sent a confirmation link to ${e}. Tap it and your farm opens right away.` : `${e} still needs to be confirmed. Use the link we emailed you, or send it again.`, _("confirm-message").textContent = "", p(t === "reset" ? "reset_sent" : "confirmation_sent"), Ke(45);
}
function Ke(e) {
	clearInterval(N);
	let t = _("resend-confirmation"), n = e, r = () => {
		t.disabled = n > 0, t.textContent = n > 0 ? `Send the email again (${n}s)` : "Send the email again", n <= 0 && clearInterval(N), n--;
	};
	r(), N = setInterval(r, 1e3);
}
function qe() {
	k = !0, I.stop(), U(), H("unauthenticated"), q("recovery"), p("recovery_open");
}
async function Z() {
	if (T) {
		E = !0;
		return;
	}
	T = !0, I.stop(), U();
	let n = x;
	H("checking", "Checking your account…");
	try {
		if (!i) throw Error("Account access is temporarily unavailable. Please try again later.");
		if (!navigator.onLine) throw Error("Connect to the internet to open your farm.");
		let a = await t();
		if (n !== x) return;
		if (!a) {
			J();
			return;
		}
		S = a.id, H("checking", "Opening your farm…");
		let l;
		try {
			l = await o({ operation: "load" });
		} catch (e) {
			if (n !== x) return;
			if (e.code === "USERNAME_REQUIRED") {
				H("unauthenticated"), q("name");
				return;
			}
			throw e;
		}
		if (n !== x) return;
		if (l.profile?.player_id !== a.id) {
			E = !0;
			return;
		}
		v = re(s, a.id), v.setClock?.(l.serverNow);
		let u = {
			playerId: S,
			presence: v,
			serverNow: l.serverNow,
			takeInitial() {
				let e = l;
				return l = null, e;
			},
			signOut: Ge,
			async leaderboard(e = "level") {
				if (n !== x) throw Error("Your session has ended.");
				let t = await te(s, a.id, e);
				if (n !== x) throw Error("Your session has ended.");
				return v?.setRows?.(t.rows), {
					...t,
					...v?.snapshot()
				};
			},
			async request(e) {
				if (n !== x || !navigator.onLine) throw Error("Your session is paused. Reconnect to continue.");
				try {
					let t = await o(e);
					if (n !== x || t.profile?.player_id !== a.id) throw Error("Your session has ended.");
					return I.ok(), t;
				} catch (t) {
					throw n === x && t.code !== "ACTION_REJECTED" && t.status !== 400 && (t.status === 401 ? (await s.auth.signOut({ scope: "local" }), J("Your session has ended. Please sign in again.")) : t.status === 409 ? Y(t.message) : [
						"player_search",
						"player_profile",
						"avatar"
					].includes(e.operation) || I.problem(r(t, navigator.onLine))), t;
				}
			},
			watchConnection(e) {
				return F.add(e), () => F.delete(e);
			}
		};
		y = u.notifications = Ae(s, { configUrl: c && `${c}/notify-hourly?config` }), y.ready?.then?.(() => y?.push?.sync?.()), u.trackCommerce = (e, t) => {
			n === x && le(e, t);
		}, u.trackGame = (e, t) => {
			n === x && he(e, t);
		}, u.payments = async (t) => {
			if (n !== x) throw Error("Your session has ended.");
			let r = await e(t);
			if (n !== x) throw Error("Your session has ended.");
			return r;
		}, u.checkout = async (e, t) => {
			u.trackCommerce("diamond_pack_started", { pack: e });
			let n = await u.payments({
				operation: "create",
				pack: e,
				requestId: t
			}), r = new URL(n.url);
			if (r.protocol !== "https:" || r.hostname !== "checkout.stripe.com") throw Error("Invalid checkout destination.");
			location.assign(r.href);
		}, u.paymentReturn = () => {
			let e = new URLSearchParams(location.search);
			return {
				id: e.get("purchase"),
				cancelled: e.get("checkout") === "cancelled"
			};
		}, u.clearPaymentReturn = () => {
			let e = new URL(location.href);
			e.searchParams.delete("purchase"), e.searchParams.delete("checkout"), history.replaceState(null, "", e.pathname + e.search + e.hash);
		}, window.harvestBridge = u, C = document.createElement("iframe"), C.title = "Harvest Tycoon farm", C.src = "/farm.html", _("farm-host").append(C), H("authenticated"), z.set(L, "1");
	} catch (e) {
		n === x && (e.status === 401 ? J("Your session has ended. Please sign in again.") : e.transient || navigator.onLine === !1 ? I.pause(r(e, navigator.onLine)) : Y(u(e)));
	} finally {
		T = !1, E && (E = !1, queueMicrotask(Z));
	}
}
document.querySelectorAll("[data-mode]").forEach((e) => e.onclick = () => {
	if (w) return;
	let t = e.dataset.mode;
	t !== b && p("mode", { mode: t }), q(t, !0);
}), _("forgot-link").onclick = () => {
	w || (p("mode", { mode: "forgot" }), q("forgot", !0));
}, _("name-toggle").onclick = () => {
	O = !0, q("register"), W("player-name");
}, _("toggle-password").onclick = () => Ue(_("password").type === "password");
for (let e of [
	"email",
	"password",
	"player-name"
]) _(e).oninput = () => G(e === "player-name" ? "name" : e);
_("account-form").addEventListener?.("focusin", (e) => {
	let t = e.target?.id;
	!t || D || (P[b] || (P[b] = !0, p("field_start", {
		mode: b,
		field: t === "player-name" ? "name" : t
	})), globalThis.innerWidth < 720 && setTimeout(() => e.target.scrollIntoView?.({
		block: "center",
		behavior: "smooth"
	}), 300));
}), _("account-form").onsubmit = async (e) => {
	if (e.preventDefault(), w) return;
	let t = _("email").value.trim(), n = _("password").value, r = Je("name") ? _("player-name").value.trim() : "", a = Se({
		mode: b,
		name: r,
		email: t,
		password: n
	}, l);
	if (Object.keys(a).length) {
		He(a), p("error", {
			mode: b,
			reason: "validation",
			field: Object.keys(a)[0]
		});
		return;
	}
	if (K(), !i) {
		Y("Account access is temporarily unavailable.");
		return;
	}
	p("submit", { mode: b }), w = !0, We(!0), _("account-message").textContent = Ve[b];
	try {
		if (b === "name") {
			let { error: e } = await s.auth.updateUser({ data: { username: r } });
			if (e) throw e;
		} else if (b === "register") {
			r ||= be();
			let { data: e, error: i } = await s.auth.signUp({
				email: t,
				password: n,
				options: {
					data: { username: r },
					emailRedirectTo: B()
				}
			});
			if (i) throw i;
			if (ie(e) && oe({ confirmationRequired: !e.session }), z.set(L, "1"), !e.session) {
				_("password").value = "", X(t);
				return;
			}
		} else if (b === "forgot") {
			let { error: e } = await s.auth.resetPasswordForEmail(t, { redirectTo: B() });
			if (e) throw e;
			X(t, { kind: "reset" });
			return;
		} else if (b === "recovery") {
			let { error: e } = await s.auth.updateUser({ password: n });
			if (e) throw e;
			k = !1, p("password_changed"), z.set(L, "1");
			try {
				history.replaceState(null, "", location.pathname);
			} catch {}
		} else {
			let { error: e } = await s.auth.signInWithPassword({
				email: t,
				password: n
			});
			if (e) throw e;
			let r = z.get(R) === "1";
			z.remove(R), p("login", {
				method: "password",
				after_signup: r
			});
		}
		await Z(), _("password").value = "";
	} catch (e) {
		let n = Ce(e, u);
		p("error", {
			mode: b,
			reason: n.reason,
			field: n.field
		}), n.resend ? X(t, { fresh: !1 }) : n.field && Je(n.field) ? G(n.field, n.message) : _("account-message").textContent = n.message;
	} finally {
		w = !1, We(!1);
	}
};
function Je(e) {
	return !_(e + "-row").hidden;
}
_("resend-confirmation").onclick = async () => {
	if (!(!M || !s)) {
		p("resend", { mode: j }), _("confirm-message").textContent = "Sending…";
		try {
			let { error: e } = j === "reset" ? await s.auth.resetPasswordForEmail(M, { redirectTo: B() }) : await s.auth.resend({
				type: "signup",
				email: M,
				options: { emailRedirectTo: B() }
			});
			if (e) throw e;
			_("confirm-message").textContent = "Sent! It can take a minute to arrive.", Ke(60);
		} catch (e) {
			let t = Ce(e, u);
			_("confirm-message").textContent = t.message, p("error", {
				mode: "confirm",
				reason: t.reason
			});
		}
	}
}, _("confirm-back").onclick = () => q(j === "reset" ? "forgot" : "register", !0), _("retry-connection").onclick = Z, _("leave-account").onclick = Ge, window.addEventListener("offline", () => {
	C && I.offline();
}), window.addEventListener("online", () => {
	I.online(), document.body.dataset.phase === "error" && I.status === "ok" && setTimeout(Z, a);
}), s && s.auth.onAuthStateChange((e, t) => {
	if (e === "PASSWORD_RECOVERY") {
		qe();
		return;
	}
	if (e === "SIGNED_OUT") {
		J();
		return;
	}
	if (!k) {
		if (e === "SIGNED_IN" && !w && T && (!S || S !== t?.user.id)) {
			U(), H("checking", "Checking your account…"), E = !0;
			return;
		}
		S && t?.user.id !== S && (U(), H("checking", "Checking your account…")), e === "SIGNED_IN" && !w && !C && setTimeout(Z, 0);
	}
});
async function Q() {
	if (!C || T || document.hidden || I.status !== "ok") return;
	let e = x;
	try {
		C.contentWindow.harvestRefresh ? await C.contentWindow.harvestRefresh() : await window.harvestBridge.request({ operation: "load" });
	} catch {
		if (e !== x) return;
	}
}
async function Ye() {
	if (!C && !await t()) throw J("Please sign in to continue."), Object.assign(/* @__PURE__ */ Error("Signed out"), { fatal: !0 });
	await o({ operation: "load" }, { retry: !1 });
}
document.addEventListener("visibilitychange", () => {
	document.hidden || (I.status === "ok" ? setTimeout(Q, a) : I.wake());
}), setInterval(Q, 6e4);
var $ = ze();
$ === "recovery" ? qe() : Be() ? (J("That link has expired or was already used. Sign in, or ask for a new link."), p("link_error")) : ($ === "signup" && (p("email_confirmed"), z.remove(R)), !$ && Ie() ? J() : Z());
//#endregion

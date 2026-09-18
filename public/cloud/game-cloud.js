import { i as e, r as t, t as n } from "./leaderboard-CAt-_Opt.js";
//#region src/ui.js
var r = (e) => document.getElementById(e);
function i({ onOpen: e, onName: t, onRetry: i, onSignIn: a, onRegister: o, onSignOut: s }) {
	let c = document.createElement("button");
	c.id = "leaderboard-button", c.className = "leaderboard-button", c.setAttribute("aria-haspopup", "dialog"), c.innerHTML = "<i data-lucide=\"trophy\"></i><span>Leaderboard</span>", document.querySelector(".tool-dock").append(c);
	let l = document.createElement("div");
	l.innerHTML = `<dialog id="auth-dialog" class="game-dialog auth-dialog" aria-labelledby="auth-title"><div class="auth-brand"><img src="/assets/harvest-tycoon-logo.png" alt="" width="92" height="92"><div><span class="eyebrow">WELCOME BACK TO THE FARM</span><h2 id="auth-title">Save your progress</h2></div></div><p class="section-copy">Sign in to access your coins, level, and player name on any device.</p><div class="auth-tabs" role="tablist"><button type="button" role="tab" data-auth-tab="signin" aria-selected="true">Sign in</button><button type="button" role="tab" data-auth-tab="register" aria-selected="false">Create account</button></div><form id="auth-form"><div id="register-name-row" hidden><label for="auth-username">Player name</label><input id="auth-username" autocomplete="nickname" minlength="3" maxlength="20" placeholder="Sunny Acres"></div><label for="auth-email">Email address</label><input id="auth-email" type="email" autocomplete="email" required placeholder="you@example.com"><label for="auth-password">Password</label><input id="auth-password" type="password" autocomplete="current-password" minlength="6" required><p id="auth-message" class="cloud-form-error" role="status"></p><button id="auth-submit" class="primary-button" type="submit">Sign in<i data-lucide="log-in"></i></button></form><p class="auth-note">Your session stays securely saved in this browser.</p></dialog>
 <dialog id="leaderboard-dialog" class="game-dialog wide-dialog" aria-labelledby="leaderboard-title"><div class="dialog-heading"><div><span class="eyebrow">GROWING TOGETHER</span><h2 id="leaderboard-title">The valley leaderboard</h2></div><button class="icon-button" data-cloud-close aria-label="Close"><i data-lucide="x"></i></button></div><p class="leaderboard-intro">Find your place in the valley. Choose a category to compare your progress. A green dot means the farmer has the game open and visible.</p><div class="cloud-profile"><span id="player-name">Your farmer profile</span><button class="small-button" id="rename-player" hidden>Change name</button><button class="small-button" id="logout-player" hidden>Sign out</button></div><div class="leaderboard-filter"><label for="leaderboard-category">Rank by</label><select id="leaderboard-category" aria-describedby="leaderboard-description">${[["progress", "Farm progress"], ["crops", "Individual crops"]].map(([e, t]) => `<optgroup label="${t}">${Object.entries(n).filter(([, t]) => (t.group ?? "progress") === e).map(([e, t]) => `<option value="${e}">${t.label}</option>`).join("")}</optgroup>`).join("")}</select><p id="leaderboard-description">${n.currency.description}</p></div><div class="cloud-sync"><span id="cloud-status" role="status">Connecting…</span><button id="retry-cloud" class="back-button">Refresh</button></div><div id="leaderboard-results" aria-live="polite"></div><p class="cloud-privacy">Your name, online status and public farming achievements appear here. Your diamonds and farm details stay private.</p></dialog>
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
//#region src/game-cloud.js
var a;
try {
	a = window.parent === window ? null : window.parent.harvestBridge;
} catch {}
if (!a) location.replace("/play.html");
else if (window.harvestInitialFarm = a.takeInitial(), !window.harvestInitialFarm) location.replace("/play.html");
else {
	document.body.hidden = !1;
	let n = i({
		onOpen: s,
		onRetry: s,
		onName: async (e) => {
			let t = await a.request({
				operation: "rename",
				username: e
			});
			n.setProfile(t.profile, { id: a.playerId });
		},
		onSignOut: () => a.signOut()
	});
	n.setProfile(window.harvestInitialFarm.profile, { id: a.playerId }), n.status("Live rankings");
	let r = a.presence?.subscribe((t) => {
		n.open && e(n.results, t);
	});
	window.addEventListener("pagehide", () => r?.(), { once: !0 });
	let o = 0;
	async function s() {
		let e = ++o, r = n.category;
		n.message("Gathering the latest scores…"), n.results.setAttribute("aria-busy", "true");
		try {
			let i = await a.leaderboard(r);
			if (e !== o) return;
			t(n.results, i, a.playerId), n.status("Up to date");
		} catch (t) {
			e === o && (n.message(t.message), n.status("Could not refresh"));
		} finally {
			e === o && n.results.setAttribute("aria-busy", "false");
		}
	}
	await import(
		/* @vite-ignore */
		"/game.js"
);
}
//#endregion

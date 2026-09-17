import { r as e, t } from "./leaderboard-MecPi8Br.js";
//#region src/ui.js
var n = (e) => document.getElementById(e);
function r({ onOpen: e, onName: r, onRetry: i, onSignIn: a, onRegister: o, onSignOut: s }) {
	let c = document.createElement("button");
	c.id = "leaderboard-button", c.className = "leaderboard-button", c.setAttribute("aria-haspopup", "dialog"), c.innerHTML = "<i data-lucide=\"trophy\"></i><span>Leaderboard</span>", document.querySelector(".tool-dock").append(c);
	let l = document.createElement("div");
	l.innerHTML = `<dialog id="auth-dialog" class="game-dialog auth-dialog" aria-labelledby="auth-title"><div class="auth-brand"><img src="/assets/harvest-tycoon-logo.png" alt="" width="92" height="92"><div><span class="eyebrow">WELCOME BACK TO THE FARM</span><h2 id="auth-title">Save your progress</h2></div></div><p class="section-copy">Sign in to access your coins, level, and player name on any device.</p><div class="auth-tabs" role="tablist"><button type="button" role="tab" data-auth-tab="signin" aria-selected="true">Sign in</button><button type="button" role="tab" data-auth-tab="register" aria-selected="false">Create account</button></div><form id="auth-form"><div id="register-name-row" hidden><label for="auth-username">Player name</label><input id="auth-username" autocomplete="nickname" minlength="3" maxlength="20" placeholder="Sunny Acres"></div><label for="auth-email">Email address</label><input id="auth-email" type="email" autocomplete="email" required placeholder="you@example.com"><label for="auth-password">Password</label><input id="auth-password" type="password" autocomplete="current-password" minlength="6" required><p id="auth-message" class="cloud-form-error" role="status"></p><button id="auth-submit" class="primary-button" type="submit">Sign in<i data-lucide="log-in"></i></button></form><p class="auth-note">Your session stays securely saved in this browser.</p></dialog>
 <dialog id="leaderboard-dialog" class="game-dialog wide-dialog" aria-labelledby="leaderboard-title"><div class="dialog-heading"><div><span class="eyebrow">GROWING TOGETHER</span><h2 id="leaderboard-title">The valley leaderboard</h2></div><button class="icon-button" data-cloud-close aria-label="Close"><i data-lucide="x"></i></button></div><p class="leaderboard-intro">Find your place in the valley. Choose a category to compare your progress.</p><div class="cloud-profile"><span id="player-name">Your farmer profile</span><button class="small-button" id="rename-player" hidden>Change name</button><button class="small-button" id="logout-player" hidden>Sign out</button></div><div class="leaderboard-filter"><label for="leaderboard-category">Rank by</label><select id="leaderboard-category" aria-describedby="leaderboard-description">${[["progress", "Farm progress"], ["crops", "Individual crops"]].map(([e, n]) => `<optgroup label="${n}">${Object.entries(t).filter(([, t]) => (t.group ?? "progress") === e).map(([e, t]) => `<option value="${e}">${t.label}</option>`).join("")}</optgroup>`).join("")}</select><p id="leaderboard-description">${t.currency.description}</p></div><div class="cloud-sync"><span id="cloud-status" role="status">Connecting…</span><button id="retry-cloud" class="back-button">Refresh</button></div><div id="leaderboard-results" aria-live="polite"></div><p class="cloud-privacy">Only your name and public farming achievements appear here. Your diamonds and farm details stay private.</p></dialog>
 <dialog id="username-dialog" class="game-dialog" aria-labelledby="username-title"><div class="dialog-heading"><div><span class="eyebrow">MEET THE OTHER FARMERS</span><h2 id="username-title">What should we call you?</h2></div><button class="icon-button" data-cloud-close aria-label="Keep playing"><i data-lucide="x"></i></button></div><p class="section-copy">Choose the display name other players will see on the leaderboard.</p><form id="username-form"><label for="username-input">Display name</label><input id="username-input" name="username" autocomplete="nickname" minlength="3" maxlength="20" required placeholder="Sunny Acres"><small>3–20 letters, numbers, spaces, underscores or hyphens.</small><p id="username-error" class="cloud-form-error" role="alert"></p><button class="primary-button" type="submit">Join the leaderboard<i data-lucide="arrow-right"></i></button></form></dialog>`, document.body.append(...l.children);
	let u = "signin";
	function d(e) {
		document.querySelectorAll("dialog[open]").forEach((e) => e.close()), n(e).showModal();
	}
	function f(e) {
		u = e, document.querySelectorAll("[data-auth-tab]").forEach((e) => e.setAttribute("aria-selected", String(e.dataset.authTab === u))), n("register-name-row").hidden = u !== "register", n("auth-username").required = u === "register", n("auth-password").autocomplete = u === "register" ? "new-password" : "current-password", n("auth-submit").innerHTML = u === "register" ? "Create account<i data-lucide=\"user-plus\"></i>" : "Sign in<i data-lucide=\"log-in\"></i>", n("auth-message").textContent = "", window.lucide?.createIcons();
	}
	function p(e = "") {
		n("username-input").value = e, n("username-error").textContent = "", d("username-dialog"), n("username-input").focus();
	}
	return document.querySelectorAll("[data-cloud-close]").forEach((e) => e.onclick = () => e.closest("dialog").close()), document.querySelectorAll("[data-auth-tab]").forEach((e) => e.onclick = () => f(e.dataset.authTab)), c.onclick = () => {
		d("leaderboard-dialog"), e();
	}, n("retry-cloud").onclick = i, n("leaderboard-category").onchange = () => {
		n("leaderboard-description").textContent = t[n("leaderboard-category").value].description, e();
	}, n("rename-player").onclick = () => p(n("player-name").dataset.username ?? ""), n("logout-player").onclick = s, n("auth-form").onsubmit = async (e) => {
		e.preventDefault();
		let t = n("auth-submit");
		t.disabled = !0, n("auth-message").textContent = u === "register" ? "Creating your account…" : "Signing in…";
		try {
			if (u === "signin") await a(n("auth-email").value, n("auth-password").value);
			else if ((await o(n("auth-email").value, n("auth-password").value, n("auth-username").value)).confirmationRequired) {
				n("auth-message").textContent = "Check your inbox and confirm your email address. You will be signed in automatically afterward.";
				return;
			}
			n("auth-dialog").close();
		} catch (e) {
			n("auth-message").textContent = e.message;
		} finally {
			t.disabled = !1;
		}
	}, n("username-form").onsubmit = async (t) => {
		t.preventDefault();
		let i = t.currentTarget.querySelector("[type=\"submit\"]");
		i.disabled = !0, n("username-error").textContent = "";
		try {
			await r(n("username-input").value), d("leaderboard-dialog"), await e();
		} catch (e) {
			n("username-error").textContent = e.message;
		} finally {
			i.disabled = !1;
		}
	}, window.lucide?.createIcons(), {
		promptName: p,
		requireAuth() {
			n("auth-dialog").open || d("auth-dialog");
		},
		authenticated() {
			n("auth-dialog").open && n("auth-dialog").close();
		},
		configurationError() {
			d("auth-dialog"), n("auth-message").textContent = "The account connection has not been configured yet.";
		},
		authMessage(e) {
			n("auth-dialog").open && (n("auth-message").textContent = e);
		},
		setProfile(e, t) {
			n("player-name").textContent = e ? e.username : "Pick your farmer name", n("player-name").dataset.username = e?.username ?? "", n("rename-player").hidden = !t, n("logout-player").hidden = !t;
		},
		status(e) {
			n("cloud-status").textContent = e;
		},
		message(e) {
			let t = document.createElement("p");
			t.className = "leaderboard-empty", t.textContent = e, n("leaderboard-results").replaceChildren(t);
		},
		get category() {
			return n("leaderboard-category").value;
		},
		get results() {
			return n("leaderboard-results");
		},
		get open() {
			return n("leaderboard-dialog").open;
		}
	};
}
//#endregion
//#region src/game-cloud.js
var i;
try {
	i = window.parent === window ? null : window.parent.harvestBridge;
} catch {}
if (!i) location.replace("/play.html");
else if (window.harvestInitialFarm = i.takeInitial(), !window.harvestInitialFarm) location.replace("/play.html");
else {
	document.body.hidden = !1;
	let t = r({
		onOpen: a,
		onRetry: a,
		onName: async (e) => {
			let n = await i.request({
				operation: "rename",
				username: e
			});
			t.setProfile(n.profile, { id: i.playerId });
		},
		onSignOut: () => i.signOut()
	});
	t.setProfile(window.harvestInitialFarm.profile, { id: i.playerId }), t.status("Live rankings");
	let n = 0;
	async function a() {
		let r = ++n, a = t.category;
		t.message("Gathering the latest scores…"), t.results.setAttribute("aria-busy", "true");
		try {
			let o = await i.leaderboard(a);
			if (r !== n) return;
			e(t.results, o, i.playerId), t.status("Up to date");
		} catch (e) {
			r === n && (t.message(e.message), t.status("Could not refresh"));
		} finally {
			r === n && t.results.setAttribute("aria-busy", "false");
		}
	}
	await import(
		/* @vite-ignore */
		"/game.js"
);
}
//#endregion

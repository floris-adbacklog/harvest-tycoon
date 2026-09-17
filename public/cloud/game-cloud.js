import { n as e } from "./leaderboard-By0gUNgN.js";
//#region src/ui.js
var t = (e) => document.getElementById(e);
function n({ onOpen: e, onName: n, onRetry: r, onSignIn: i, onRegister: a, onSignOut: o }) {
	let s = document.createElement("button");
	s.id = "leaderboard-button", s.className = "leaderboard-button", s.setAttribute("aria-haspopup", "dialog"), s.innerHTML = "<i data-lucide=\"trophy\"></i><span>Leaderboard</span>", document.querySelector(".tool-dock").append(s);
	let c = document.createElement("div");
	c.innerHTML = "<dialog id=\"auth-dialog\" class=\"game-dialog auth-dialog\" aria-labelledby=\"auth-title\"><div class=\"auth-brand\"><img src=\"/assets/harvest-tycoon-logo.png\" alt=\"\" width=\"92\" height=\"92\"><div><span class=\"eyebrow\">WELCOME BACK TO THE FARM</span><h2 id=\"auth-title\">Save your progress</h2></div></div><p class=\"section-copy\">Sign in to access your coins, level, and player name on any device.</p><div class=\"auth-tabs\" role=\"tablist\"><button type=\"button\" role=\"tab\" data-auth-tab=\"signin\" aria-selected=\"true\">Sign in</button><button type=\"button\" role=\"tab\" data-auth-tab=\"register\" aria-selected=\"false\">Create account</button></div><form id=\"auth-form\"><div id=\"register-name-row\" hidden><label for=\"auth-username\">Player name</label><input id=\"auth-username\" autocomplete=\"nickname\" minlength=\"3\" maxlength=\"20\" placeholder=\"Sunny Acres\"></div><label for=\"auth-email\">Email address</label><input id=\"auth-email\" type=\"email\" autocomplete=\"email\" required placeholder=\"you@example.com\"><label for=\"auth-password\">Password</label><input id=\"auth-password\" type=\"password\" autocomplete=\"current-password\" minlength=\"6\" required><p id=\"auth-message\" class=\"cloud-form-error\" role=\"status\"></p><button id=\"auth-submit\" class=\"primary-button\" type=\"submit\">Sign in<i data-lucide=\"log-in\"></i></button></form><p class=\"auth-note\">Your session stays securely saved in this browser.</p></dialog>\n <dialog id=\"leaderboard-dialog\" class=\"game-dialog wide-dialog\" aria-labelledby=\"leaderboard-title\"><div class=\"dialog-heading\"><div><span class=\"eyebrow\">GROWING TOGETHER</span><h2 id=\"leaderboard-title\">The valley leaderboard</h2></div><button class=\"icon-button\" data-cloud-close aria-label=\"Close\"><i data-lucide=\"x\"></i></button></div><p class=\"leaderboard-intro\">The top 20 farmers by current coins. Shared scores, personal farms.</p><div class=\"cloud-profile\"><span id=\"player-name\">Your farmer profile</span><button class=\"small-button\" id=\"rename-player\" hidden>Change name</button><button class=\"small-button\" id=\"logout-player\" hidden>Sign out</button></div><div class=\"cloud-sync\"><span id=\"cloud-status\" role=\"status\">Connecting…</span><button id=\"retry-cloud\" class=\"back-button\">Refresh</button></div><div id=\"leaderboard-results\" aria-live=\"polite\"></div><p class=\"cloud-privacy\">Your player name, coins, and level are linked to your account and shared on the leaderboard.</p></dialog>\n <dialog id=\"username-dialog\" class=\"game-dialog\" aria-labelledby=\"username-title\"><div class=\"dialog-heading\"><div><span class=\"eyebrow\">MEET THE OTHER FARMERS</span><h2 id=\"username-title\">What should we call you?</h2></div><button class=\"icon-button\" data-cloud-close aria-label=\"Keep playing\"><i data-lucide=\"x\"></i></button></div><p class=\"section-copy\">Choose the display name other players will see on the leaderboard.</p><form id=\"username-form\"><label for=\"username-input\">Display name</label><input id=\"username-input\" name=\"username\" autocomplete=\"nickname\" minlength=\"3\" maxlength=\"20\" required placeholder=\"Sunny Acres\"><small>3–20 letters, numbers, spaces, underscores or hyphens.</small><p id=\"username-error\" class=\"cloud-form-error\" role=\"alert\"></p><button class=\"primary-button\" type=\"submit\">Join the leaderboard<i data-lucide=\"arrow-right\"></i></button></form></dialog>", document.body.append(...c.children);
	let l = "signin";
	function u(e) {
		document.querySelectorAll("dialog[open]").forEach((e) => e.close()), t(e).showModal();
	}
	function d(e) {
		l = e, document.querySelectorAll("[data-auth-tab]").forEach((e) => e.setAttribute("aria-selected", String(e.dataset.authTab === l))), t("register-name-row").hidden = l !== "register", t("auth-username").required = l === "register", t("auth-password").autocomplete = l === "register" ? "new-password" : "current-password", t("auth-submit").innerHTML = l === "register" ? "Create account<i data-lucide=\"user-plus\"></i>" : "Sign in<i data-lucide=\"log-in\"></i>", t("auth-message").textContent = "", window.lucide?.createIcons();
	}
	function f(e = "") {
		t("username-input").value = e, t("username-error").textContent = "", u("username-dialog"), t("username-input").focus();
	}
	return document.querySelectorAll("[data-cloud-close]").forEach((e) => e.onclick = () => e.closest("dialog").close()), document.querySelectorAll("[data-auth-tab]").forEach((e) => e.onclick = () => d(e.dataset.authTab)), s.onclick = () => {
		u("leaderboard-dialog"), e();
	}, t("retry-cloud").onclick = r, t("rename-player").onclick = () => f(t("player-name").dataset.username ?? ""), t("logout-player").onclick = o, t("auth-form").onsubmit = async (e) => {
		e.preventDefault();
		let n = t("auth-submit");
		n.disabled = !0, t("auth-message").textContent = l === "register" ? "Creating your account…" : "Signing in…";
		try {
			if (l === "signin") await i(t("auth-email").value, t("auth-password").value);
			else if ((await a(t("auth-email").value, t("auth-password").value, t("auth-username").value)).confirmationRequired) {
				t("auth-message").textContent = "Check your inbox and confirm your email address. You will be signed in automatically afterward.";
				return;
			}
			t("auth-dialog").close();
		} catch (e) {
			t("auth-message").textContent = e.message;
		} finally {
			n.disabled = !1;
		}
	}, t("username-form").onsubmit = async (r) => {
		r.preventDefault();
		let i = r.currentTarget.querySelector("[type=\"submit\"]");
		i.disabled = !0, t("username-error").textContent = "";
		try {
			await n(t("username-input").value), u("leaderboard-dialog"), await e();
		} catch (e) {
			t("username-error").textContent = e.message;
		} finally {
			i.disabled = !1;
		}
	}, window.lucide?.createIcons(), {
		promptName: f,
		requireAuth() {
			t("auth-dialog").open || u("auth-dialog");
		},
		authenticated() {
			t("auth-dialog").open && t("auth-dialog").close();
		},
		configurationError() {
			u("auth-dialog"), t("auth-message").textContent = "The account connection has not been configured yet.";
		},
		authMessage(e) {
			t("auth-dialog").open && (t("auth-message").textContent = e);
		},
		setProfile(e, n) {
			t("player-name").textContent = e ? e.username : "Pick your farmer name", t("player-name").dataset.username = e?.username ?? "", t("rename-player").hidden = !n, t("logout-player").hidden = !n;
		},
		status(e) {
			t("cloud-status").textContent = e;
		},
		message(e) {
			let n = document.createElement("p");
			n.className = "leaderboard-empty", n.textContent = e, t("leaderboard-results").replaceChildren(n);
		},
		get results() {
			return t("leaderboard-results");
		},
		get open() {
			return t("leaderboard-dialog").open;
		}
	};
}
//#endregion
//#region src/game-cloud.js
var r;
try {
	r = window.parent === window ? null : window.parent.harvestBridge;
} catch {}
if (!r) location.replace("/play.html");
else if (window.harvestInitialFarm = r.takeInitial(), !window.harvestInitialFarm) location.replace("/play.html");
else {
	document.body.hidden = !1;
	let t = n({
		onOpen: i,
		onRetry: i,
		onName: async (e) => {
			let n = await r.request({
				operation: "rename",
				username: e
			});
			t.setProfile(n.profile, { id: r.playerId });
		},
		onSignOut: () => r.signOut()
	});
	t.setProfile(window.harvestInitialFarm.profile, { id: r.playerId }), t.status("Your farm is saved to your account");
	async function i() {
		t.message("Gathering the latest scores…");
		try {
			e(t.results, await r.leaderboard(), r.playerId);
		} catch (e) {
			t.message(e.message);
		}
	}
	await import(
		/* @vite-ignore */
		"/game.js"
);
}
//#endregion

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://qrvaswhgvaxjngwslhcv.supabase.co";
const supabaseKey = "sb_publishable_ao9SQOcidOGAiCG8dl8O8w_bdQcR_Oy";
const supabase = createClient(supabaseUrl, supabaseKey);

const panel = document.getElementById("loginPanel");
const openBtn = document.getElementById("loginOpenBtn");
const closeBtn = document.getElementById("loginCloseBtn");
const loginDropdown = document.getElementById("loginDropdown");
const loginDropdownButton = document.getElementById("loginDropdownButton");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");
const logoutBtnHeader = document.getElementById("logoutBtnHeader");
const loggedOut = document.getElementById("loginLoggedOut");
const loggedIn = document.getElementById("loginLoggedIn");
const whoami = document.getElementById("whoami");
const tabButtons = document.querySelectorAll("[data-tab]");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginMsg = document.getElementById("loginMsg");
const signupMsg = document.getElementById("signupMsg");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;
let currentProfile = null;

function setPanelOpen(isOpen) {
	panel.classList.toggle("open", isOpen);
	panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
}

function show(el, isVisible) {
	el.style.display = isVisible ? "" : "none";
}

function updateUI() {
	if (!currentUser) {
		show(loggedOut, true);
		show(loggedIn, false);
		show(openBtn, true);
		show(loginDropdown, false);
		return;
	}

	show(loggedOut, false);
	show(loggedIn, true);
	show(openBtn, false);
	show(loginDropdown, true);

	const displayName = currentProfile?.username || currentUser.email;
	whoami.textContent = "Innlogget som " + displayName;
	loginDropdownButton.textContent = displayName;
}

async function refreshAuthUI() {
	const { data: { user } } = await supabase.auth.getUser();
	console.log("[auth] getUser", user ? "signed in" : "signed out");

	if (!user) {
		currentUser = null;
		currentProfile = null;
		updateUI();
		return;
	}

	currentUser = user;
	const { data } = await supabase
		.from("users")
		.select("id, username, email, auth_user_id")
		.eq("auth_user_id", user.id)
		.maybeSingle();
	console.log("[auth] profile", data ? "loaded" : "missing");

	currentProfile = data || null;
	updateUI();
}

openBtn.addEventListener("click", () => setPanelOpen(true));
closeBtn.addEventListener("click", () => setPanelOpen(false));

tabButtons.forEach((btn) => {
	btn.addEventListener("click", () => {
		tabButtons.forEach((button) => button.classList.remove("active"));
		btn.classList.add("active");
		const tab = btn.dataset.tab;
		loginForm.style.display = tab === "login" ? "" : "none";
		signupForm.style.display = tab === "signup" ? "" : "none";
	});
});

loginForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	loginMsg.textContent = "Logger inn...";
	console.log("[auth] login submit");

	const email = loginEmail.value.trim().toLowerCase();
	const password = loginPassword.value;

	if (!email || !password) {
		loginMsg.textContent = "Fyll inn alle felter.";
		return;
	}

	const { error } = await supabase.auth.signInWithPassword({
		email,
		password
	});
	console.log("[auth] login response", error ? error.message : "ok");

	if (error) {
		loginMsg.textContent = "Feil: " + error.message;
		return;
	}

	loginMsg.textContent = "Innlogget.";
	await refreshAuthUI();
	setTimeout(() => setPanelOpen(false), 300);
});

async function handleLogout() {
	console.log("[auth] logout");
	await supabase.auth.signOut();
	await refreshAuthUI();
}

logoutBtn.addEventListener("click", handleLogout);
logoutBtnHeader.addEventListener("click", (event) => {
	event.preventDefault();
	handleLogout();
});

changeUsernameBtn.addEventListener("click", async (event) => {
	event.preventDefault();
	if (!currentUser) {
		return;
	}

	const newName = window.prompt("Nytt brukernavn:", currentProfile?.username || "");
	if (!newName) {
		return;
	}

	const { data, error } = await supabase
		.from("users")
		.update({ username: newName.trim() })
		.eq("auth_user_id", currentUser.id)
		.select("id, username, email, auth_user_id")
		.maybeSingle();

	if (error || !data) {
		window.alert("Kunne ikke oppdatere brukernavn.");
		return;
	}

	currentProfile = data;
	updateUI();
});

signupForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	signupMsg.textContent = "Oppretter konto...";
	console.log("[auth] signup submit");

	const username = signupUsername.value.trim();
	const email = signupEmail.value.trim().toLowerCase();
	const password = signupPassword.value;

	if (!email || !password) {
		signupMsg.textContent = "Fyll inn e-post og passord.";
		return;
	}

	const { error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: {
				username: username || null
			}
		}
	});
	console.log("[auth] signup response", error ? error.message : "ok");

	if (error) {
		signupMsg.textContent = "Feil: " + error.message;
		return;
	}

	signupMsg.textContent = "Konto opprettet. Sjekk e-posten din.";
});

supabase.auth.onAuthStateChange((event, session) => {
	console.log("[auth] state", event, session?.user?.id || "no session");
	refreshAuthUI();
});
refreshAuthUI();

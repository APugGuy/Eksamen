import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://qrvaswhgvaxjngwslhcv.supabase.co";
const supabaseKey = "sb_publishable_ao9SQOcidOGAiCG8dl8O8w_bdQcR_Oy";
const supabase = createClient(supabaseUrl, supabaseKey);

//------------------vise koblingen på console----------------------

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
//-----------------getElementById-------------------------

const loginPassword = document.getElementById("loginPassword");
const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const logoutBtn = document.getElementById("logoutBtn");

const messageForm = document.getElementById("messageForm");
const messageContent = document.getElementById("messageContent");
const messageList = document.getElementById("messageList");
const messageStatus = document.getElementById("messageStatus");
const messageMsg = document.getElementById("messageMsg");

let currentUser = null;
let currentProfile = null;
let currentRole = "user";

function setPanelOpen(isOpen) {
	panel.classList.toggle("open", isOpen);
	panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
}

function show(el, isVisible) {
	el.style.display = isVisible ? "" : "none";
}
//-----------? : if else --------------------------- og function----------

function updateUI() {
	if (!currentUser) {
		show(loggedOut, true);
		show(loggedIn, false);
		show(openBtn, true);
		show(loginDropdown, false);
		updateMessageUI();
		return;
	}

	show(loggedOut, false);
	show(loggedIn, true);
	show(openBtn, false);
	show(loginDropdown, true);

	const displayName = currentProfile?.username || currentUser.email;
	whoami.textContent = "Innlogget som " + displayName;
	loginDropdownButton.textContent = displayName;
	updateMessageUI();
}

function escapeHtml(value) {
	return (value || "").replace(/[<>&"']/g, (ch) => ({
		"<": "&lt;",
		">": "&gt;",
		"&": "&amp;",
		"\"": "&quot;",
		"'": "&#39;"
	}[ch]));
}

function formatTime(value) {
	return value ? new Date(value).toLocaleString() : "";
}

function isStaff() {
	return currentRole === "it" || currentRole === "admin";
}

function isAdmin() {
	return currentRole === "admin";
}

function updateMessageUI() {
	if (!currentUser) {
		show(messageForm, false);
		messageStatus.textContent = "Logg inn for å sende melding.";
		messageList.innerHTML = "";
		messageMsg.textContent = "";
		return;
	}

	show(messageForm, !isStaff());
	messageStatus.textContent = isStaff()
		? "Du ser alle meldinger og kan svare."
		: "Du ser dine meldinger og svar.";
	messageMsg.textContent = "";
	loadMessages();
}

function renderMessages(messages) {
	if (!messages || messages.length === 0) {
		messageList.innerHTML = "<div class=\"msg-status\">Ingen meldinger ennå.</div>";
		return;
	}

	messageList.innerHTML = messages.map((msg) => {
		const sender = "Anonym";
		const content = escapeHtml(msg.content || "");
		const created = formatTime(msg.created_at);
		const responseName = escapeHtml(msg.response_by_name || "IT");
		const response = msg.response
			? `<div class="msg-response"><strong>Svar fra ${responseName}:</strong> ${escapeHtml(msg.response)}</div>`
			: "<div class=\"msg-response\"><strong>Svar:</strong> Ikke besvart ennå.</div>";
		let reply = "";
		let adminActions = "";

		if (isStaff()) {
			const replyValue = escapeHtml(msg.response || "");
			const toggleLabel = msg.response ? "Edit svar" : "Legg til kommentar";
			reply = `
				<button class="reply-toggle-btn" type="button" data-toggle-reply="${msg.id}" data-label="${toggleLabel}">${toggleLabel}</button>
				<div id="reply-row-${msg.id}" class="reply-row" style="display: none;">
					<input id="reply-${msg.id}" class="reply-input" type="text" placeholder="Skriv svar..." value="${replyValue}">
					<button class="reply-btn" type="button" data-reply="${msg.id}">Svar</button>
				</div>
			`;
		}

		if (isAdmin()) {
			adminActions = `
				<button class="delete-btn" type="button" data-delete="${msg.id}">Slett</button>
			`;
		}

		return `
			<div class="msg-card">
				<div><strong>${sender}</strong>: ${content}</div>
				<div class="msg-meta">${created}</div>
				${response}
				${reply}
				${adminActions}
			</div>
		`;
	}).join("");
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
		.select("id, username, email, auth_user_id, role")
		.eq("auth_user_id", user.id)
		.maybeSingle();
	console.log("[auth] profile", data ? "loaded" : "missing");

	currentProfile = data || null;
	currentRole = currentProfile?.role || "user";
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
		.select("id, username, email, auth_user_id, role")
		.maybeSingle();

	if (error || !data) {
		window.alert("Kunne ikke oppdatere brukernavn.");
		return;
	}

	currentProfile = data;
	currentRole = currentProfile?.role || "user";
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

async function loadMessages() {
	if (!currentUser) {
		return;
	}

	messageStatus.textContent = "Laster meldinger...";
	let query = supabase
		.from("messages")
		.select("id, user_id, content, response, response_by_name, created_at, responded_at")
		.order("created_at", { ascending: false })
		.limit(200);

	if (!isStaff()) {
		query = query.eq("user_id", currentUser.id);
	}

	const { data, error } = await query;
	if (error) {
		messageStatus.textContent = "Feil: " + error.message;
		return;
	}

	messageStatus.textContent = isStaff()
		? "Du ser alle meldinger og kan svare."
		: "Du ser dine meldinger og svar.";

	renderMessages(data || []);
}

messageForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	messageMsg.textContent = "Sender...";

	if (!currentUser) {
		messageMsg.textContent = "Du må være innlogget.";
		return;
	}

	const text = messageContent.value.trim();
	if (!text) {
		messageMsg.textContent = "Skriv en melding.";
		return;
	}

	const { error } = await supabase.from("messages").insert({
		user_id: currentUser.id,
		content: text
	});

	if (error) {
		messageMsg.textContent = "Feil: " + error.message;
		return;
	}

	messageContent.value = "";
	messageMsg.textContent = "Sendt.";
	await loadMessages();
});

messageList.addEventListener("click", async (event) => {
	const deleteButton = event.target.closest("[data-delete]");
	if (deleteButton && isAdmin()) {
		const messageId = deleteButton.dataset.delete;
		const ok = window.confirm("Slette denne meldingen?");
		if (!ok) {
			return;
		}

		deleteButton.disabled = true;
		const { error } = await supabase
			.from("messages")
			.delete()
			.eq("id", messageId);
		deleteButton.disabled = false;

		if (error) {
			window.alert("Feil: " + error.message);
			return;
		}

		await loadMessages();
		return;
	}

	const toggleButton = event.target.closest("[data-toggle-reply]");
	if (toggleButton && isStaff()) {
		const messageId = toggleButton.dataset.toggleReply;
		const row = document.getElementById(`reply-row-${messageId}`);
		if (row) {
			const isHidden = row.style.display === "none" || row.style.display === "";
			row.style.display = isHidden ? "flex" : "none";
			toggleButton.textContent = isHidden ? "Skjul" : toggleButton.dataset.label;
			if (isHidden) {
				const input = document.getElementById(`reply-${messageId}`);
				if (input) {
					input.focus();
				}
			}
		}
		return;
	}

	const button = event.target.closest("[data-reply]");
	if (!button || !isStaff()) {
		return;
	}

	const messageId = button.dataset.reply;
	const input = document.getElementById(`reply-${messageId}`);
	if (!input) {
		return;
	}

	const replyText = input.value.trim();
	if (!replyText) {
		window.alert("Skriv et svar først.");
		return;
	}

	button.disabled = true;
	const responderName = currentProfile?.username || currentUser.email || "IT";
	const { error } = await supabase
		.from("messages")
		.update({
			response: replyText,
			response_by_name: responderName,
			responded_at: new Date().toISOString()
		})
		.eq("id", messageId);
	button.disabled = false;

	if (error) {
		window.alert("Feil: " + error.message);
		return;
	}

	input.value = "";
	await loadMessages();
});

supabase.auth.onAuthStateChange((event, session) => {
	console.log("[auth] state", event, session?.user?.id || "no session");
	refreshAuthUI();
});
refreshAuthUI();

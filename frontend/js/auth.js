const showRegisterBtn = document.querySelector("#show-register-button");
const showLoginBtn = document.querySelector("#show-login-button");

const loginUsernameInput = document.querySelector("#login-username-input");
const loginPasswordInput = document.querySelector("#login-password-input");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const registerNameInput = document.querySelector("#register-name-input");
const registerEmailInput = document.querySelector("#register-email-input");
const registerUsernameInput = document.querySelector("#register-username-input");
const registerPasswordInput = document.querySelector("#register-password-input");


const checkRegisterUsername = async (username) => {};

const login = async () => {
    const username = loginUsernameInput.value;
    const password = loginPasswordInput.value;

    if (!username || !password) {
        showToast("Please enter username and password");
        if (!username) loginUsernameInput.classList.add("input-error");
        if (!password) loginPasswordInput.classList.add("input-error");
        return;
    }

    const data = await loginRequest(username, password);

    if (!data.success) {
        showToast(data.detail);
        loginUsernameInput.classList.add("input-error");
        loginPasswordInput.classList.add("input-error");
        return;
    }

    saveTokens(data.access_token, data.refresh_token);
    window.location.href = "notes.html";
};

const register = async () => {
    const name = registerNameInput.value;
    const email = registerEmailInput.value;
    const username = registerUsernameInput.value;
    const password = registerPasswordInput.value;

    if (!username || !password || !email || !name) {
        showToast("Please enter name, email, username and password");
        if (!username) registerUsernameInput.classList.add("input-error");
        if (!password) registerPasswordInput.classList.add("input-error");
        if (!email) registerEmailInput.classList.add("input-error");
        if (!name) registerNameInput.classList.add("input-error");
        return;
    }

    const data = await registerRequest(name, username, email, password);

    if (!data.success) {
        showToast(data.detail);
        registerUsernameInput.classList.add("input-error");
        registerPasswordInput.classList.add("input-error");
        registerEmailInput.classList.add("input-error");
        registerNameInput.classList.add("input-error");
        return;
    }

    saveTokens(data.access_token, data.refresh_token);
    window.location.href = "notes.html";
};

document.addEventListener("DOMContentLoaded", () => {
    const authWindow = document.querySelector("#auth-window");
    const authCard = document.querySelector("#auth-card");
    const showRegisterBtn = document.querySelector("#show-register-button");
    const showLoginBtn = document.querySelector("#show-login-button");

    showRegisterBtn.addEventListener("click", () => {
        authCard.classList.add("flipped");
        authWindow.classList.add("register-active");
    });

    showLoginBtn.addEventListener("click", () => {
        authCard.classList.remove("flipped");
        authWindow.classList.remove("register-active");
    });
});

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    login();
});

registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    register();
});

loginUsernameInput.addEventListener("input", () => {
    loginUsernameInput.classList.remove("input-error");
});

loginPasswordInput.addEventListener("input", () => {
    loginPasswordInput.classList.remove("input-error");
});

registerNameInput.addEventListener("input", () => {
    registerNameInput.classList.remove("input-error");
});

registerEmailInput.addEventListener("input", () => {
    registerEmailInput.classList.remove("input-error");
});

registerUsernameInput.addEventListener("input", () => {
    registerUsernameInput.classList.remove("input-error");
});

registerPasswordInput.addEventListener("input", () => {
    registerPasswordInput.classList.remove("input-error");
});

import { loginRequest, registerRequest, checkUsernameRequest } from "./api.js";
import { navigateTo } from "./router.js";
import { saveTokens } from "./storage.js";
import { showToast, formatErrorMessage } from "./ui.js";

const showRegisterBtn = document.querySelector("#show-register-button");
const showLoginBtn = document.querySelector("#show-login-button");
const registerBtn = document.querySelector("#register-button");

const loginUsernameInput = document.querySelector("#login-username-input");
const loginPasswordInput = document.querySelector("#login-password-input");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const registerNameInput = document.querySelector("#register-name-input");
const registerEmailInput = document.querySelector("#register-email-input");
const registerUsernameInput = document.querySelector("#register-username-input");
const registerPasswordInput = document.querySelector("#register-password-input");
const checkBoxYes = document.querySelector(".check-box-yes");
const checkBoxNo = document.querySelector(".check-box-no");

let debounceTimeout = null;


const initPasswordToggle = (inputId, buttonId) => {
    const passwordInput = document.querySelector(inputId);
    const toggleButton = document.querySelector(buttonId);

    if (!passwordInput || !toggleButton) return;

    toggleButton.addEventListener("click", () => {
        const isPassword = passwordInput.getAttribute("type") === "password";
        
        passwordInput.setAttribute("type", isPassword ? "text" : "password");
        
        toggleButton.classList.toggle("visible", isPassword);

        toggleButton.setAttribute("aria-label", isPassword ? "Скрыть пароль" : "Показать пароль");
    });
};

const checkRegisterUsername = async (username) => {
    if (!username) return;

    const data = await checkUsernameRequest(username);

    if (!data || data.success === false) {
        return; 
    }

    if (data.detail === false) {
        checkBoxNo.classList.remove("hidden");
        registerBtn.disabled = true;
    } else {
        checkBoxYes.classList.remove("hidden");
        registerBtn.disabled = false;
    }
};

const clearErrorOnInput = (inputElement) => {
    inputElement.addEventListener("input", () => {
        inputElement.classList.remove("input-error");
    }, { once: true });
};

const clearInputsBeforeSuccess = () => {
    loginUsernameInput.value = "";
    loginPasswordInput.value = "";
    registerNameInput.value = "";
    registerEmailInput.value = "";
    registerUsernameInput.value = "";
    registerPasswordInput.value = "";
};

const login = async () => {
    const inputs = [loginUsernameInput, loginPasswordInput];
    inputs.forEach(input => input.classList.remove("input-error"));
    
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!username || !password) {
        showToast("Please fill in all fields", "warning");
        if (!username) loginUsernameInput.classList.add("input-error");
        if (!password) loginPasswordInput.classList.add("input-error");
        return;
    }

    const data = await loginRequest(username, password);

    if (!data.success) {
        showToast(data.detail || "Unable to sign in right now", "warning");
        loginUsernameInput.classList.add("input-error");
        loginPasswordInput.classList.add("input-error");
        return;
    }

    saveTokens(data.access_token, data.refresh_token);
    navigateTo("/app");
    clearInputsBeforeSuccess();
};

const register = async () => {
    const inputMapping = {
        name: registerNameInput,
        email: registerEmailInput,
        username: registerUsernameInput,
        password: registerPasswordInput
    };

    Object.values(inputMapping).forEach(input => input.classList.remove("input-error"));
    
    const name = registerNameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const username = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value.trim();

    if (!username || !password || !email || !name) {
        showToast("Please fill in all fields", "warning");
        if (!username) { registerUsernameInput.classList.add("input-error"); clearErrorOnInput(registerUsernameInput); }
        if (!password) { registerPasswordInput.classList.add("input-error"); clearErrorOnInput(registerPasswordInput); }
        if (!email) { registerEmailInput.classList.add("input-error"); clearErrorOnInput(registerEmailInput); }
        if (!name) { registerNameInput.classList.add("input-error"); clearErrorOnInput(registerNameInput); }
        return;
    }

    const data = await registerRequest(name, username, email, password);

    if (!data.success) {
        const errorMessages = [];

        if (Array.isArray(data.detail)) {
            data.detail.forEach(errorItem => {
                const fieldName = errorItem.loc[1];
                const targetInput = inputMapping[fieldName];

                if (targetInput) {
                    targetInput.classList.add("input-error");
                    clearErrorOnInput(targetInput);
                }

                const humanReadableMessage = formatErrorMessage(errorItem, fieldName);
                errorMessages.push(humanReadableMessage);
            });

        } else {
            const rawErrors = Array.isArray(data.detail) ? data.detail : [data.detail || "Registration failed"];

            rawErrors.forEach(errorText => {
                const lowerError = errorText.toLowerCase();
                let matched = false;

                if (lowerError.includes("email")) {
                    registerEmailInput.classList.add("input-error");
                    clearErrorOnInput(registerEmailInput);
                    matched = true;
                }
                if (lowerError.includes("username")) {
                    registerUsernameInput.classList.add("input-error");
                    clearErrorOnInput(registerUsernameInput);
                    matched = true;
                }
                if (!matched) {
                    Object.values(inputMapping).forEach(input => {
                        input.classList.add("input-error");
                        clearErrorOnInput(input);
                    });
                }

                errorMessages.push(errorText);
            });
        }

        showToast(errorMessages.join(" | ") || "Unable to create account right now", "warning");
        return;
    }

    saveTokens(data.access_token, data.refresh_token);
    navigateTo("/app");
    clearInputsBeforeSuccess();
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

    initPasswordToggle("#login-password-input", "#login-toggle-password");
    initPasswordToggle("#register-password-input", "#register-toggle-password");
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
    
    registerBtn.disabled = true;

    checkBoxYes.classList.add("hidden");
    checkBoxNo.classList.add("hidden");
    
    clearTimeout(debounceTimeout);
    
    const username = registerUsernameInput.value.trim();
    
    if (username.length >= 4) {
        debounceTimeout = setTimeout(() => {
            checkRegisterUsername(username);
        }, 1000);
    }
});

registerPasswordInput.addEventListener("input", () => {
    registerPasswordInput.classList.remove("input-error");
});

import { getUserMeRequest, editUserProfileRequest, logoutRequest } from "./api.js";
import { showToast, closeModal } from "./ui.js";
import { navigateTo } from "./router.js";

const appModalsWindow = document.querySelector(".app-modals");
const accountModal = document.querySelector(".account-modal"); 
const accountModalClose = document.querySelector(".account-form-cancel");
const accountModalLogout = document.querySelector(".account-form-logout");
const accountFrom = document.querySelector("#profile-form");

const myProfileBtn = document.querySelector("#nav-userInfo");

let userName = null;
let userUsername = null;


const getFirstLetter = (name) => {
    try {
        if (!name || typeof name !== "string") {
            showToast("Invalid name provided");
        }

        const trimmedName = name.trim();

        if (trimmedName.length === 0) {
            showToast("Name is empty or contains only spaces");
        }

        return trimmedName.charAt(0).toUpperCase();

    } catch (error) {
        showToast(`Error in getFirstLetter: ${error.message}`);
        return "?"; 
    }
};

export const renderNavBarProfile = async () => {
    try {
        const profileName = document.querySelector(".nav-user-name");
        const profileUsername = document.querySelector(".user-username");
        const avatarElement = document.querySelector(".nav-user-avatar");
        const allNotesCount = document.querySelector("#all-notes-count");
        const archivedNotesCount = document.querySelector("#archived-notes-count");
        const profileNameInput = document.querySelector("#profile-input-name");
        const profileUsernameInput = document.querySelector("#profile-input-username");
        
        const accessToken = localStorage.getItem("access_token");
        
        if (!accessToken) {
            showToast("Access token not found in storage");
        };

        const data = await getUserMeRequest(accessToken);

        if (!data || !data.success) {
            showToast(data?.detail || "Failed to fetch user profile data");
        };

        localStorage.setItem("user_id", data.id);

        if (profileName) {
            profileName.textContent = data.name || "Unknown User";
            profileNameInput.value = data.name || "";
            userName = data.name || "";
        };
        
        if (profileUsername) {
            profileUsername.textContent = data.username ? `${data.username.replace(/^@/, '')}` : "";
            profileUsernameInput.value = data.username ? `${data.username.replace(/^@/, '')}` : "";
            userUsername = data.username ? `${data.username.replace(/^@/, '')}` : "";
        };
        
        if (avatarElement && data.name) {
            avatarElement.textContent = getFirstLetter(data.name);
        };

        if (allNotesCount) {
            allNotesCount.textContent = data.all_notes_count;
        };

        if (archivedNotesCount) {
            archivedNotesCount.textContent = data.archived_notes_count;
        };

    } catch (error) {
        showToast("Could not load profile information");
    }
};

myProfileBtn.addEventListener("click", () => {
    appModalsWindow.classList.add("is-open");
    accountModal.classList.add("is-open");
});

accountModalClose.addEventListener("click", () => {
    closeModal(accountModal);
});

accountFrom.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (userName === accountFrom.name.value && userUsername === accountFrom.username.value) {
        showToast("No changes were made", "warning");
        return;
    }

    try {
        const data = await editUserProfileRequest(
            accountFrom.name.value, 
            accountFrom.username.value, 
            localStorage.getItem("access_token")
        );

        if (!data || !data.success) {
            showToast(data?.detail || "Failed to fetch user profile data");
        }

        closeModal(accountModal);
        showToast("Profile updated successfully", "success");
        renderNavBarProfile();
    } catch (error) {
        showToast(`Failed to update profile: ${error.message}`);
    }
});

accountModalLogout.addEventListener("click", async () => {
    try {
        if (localStorage.getItem("access_token") && localStorage.getItem("refresh_token")) {
            const data = await logoutRequest(localStorage.getItem("access_token"), localStorage.getItem("refresh_token"));

            if (!data || !data.success) {
                showToast(data?.detail || "Failed to logout");
            };

            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_id");
            appModalsWindow.classList.remove("is-open");
            accountModal.classList.remove("is-open");
            navigateTo("/auth");
        } else {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_id");
            appModalsWindow.classList.remove("is-open");
            accountModal.classList.remove("is-open");
            navigateTo("/auth");
        };
    } catch (error) {
        showToast(`Failed to logout: ${error.message}`);
    };
});

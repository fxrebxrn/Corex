import { getUserMeRequest, editUserProfileRequest } from "./api.js";
import { showToast } from "./ui.js";

const appModalsWindow = document.querySelector(".app-modals");
const accountModal = document.querySelector(".account-modal"); 
const accountModalClose = document.querySelector(".account-form-cancel");
const accountFrom = document.querySelector("#profile-form");

const myProfileBtn = document.querySelector("#nav-userInfo");

let userName = null;
let userUsername = null;


const getFirstLetter = (name) => {
    try {
        if (!name || typeof name !== "string") {
            throw new Error("Invalid name provided");
        }

        const trimmedName = name.trim();

        if (trimmedName.length === 0) {
            throw new Error("Name is empty or contains only spaces");
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
            throw new Error("Access token not found in storage");
        };

        const data = await getUserMeRequest(accessToken);

        if (!data || !data.success) {
            throw new Error(data?.detail || "Failed to fetch user profile data");
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

const closeModal = (modal) => {
    appModalsWindow.classList.add('is-closing');
    modal.classList.add('is-closing');

    appModalsWindow.classList.remove('is-open');
    modal.classList.remove('is-open');

    setTimeout(() => {
        appModalsWindow.classList.remove('is-closing');
        modal.classList.remove('is-closing');
    }, 300);
}

if (appModalsWindow) {
    appModalsWindow.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) {

            const activeModal = appModalsWindow.querySelector('.is-open');
            
            if (activeModal) {
                closeModal(activeModal);
            }
        }
    });
}

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
            throw new Error(data?.detail || "Failed to fetch user profile data");
        }

        closeModal(accountModal);
        showToast("Profile updated successfully", "success");
        renderNavBarProfile();
    } catch (error) {
        showToast(`Failed to update profile: ${error.message}`);
    }
});

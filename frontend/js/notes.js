import { getUserMeRequest } from "./api.js";
import { showToast } from "./ui.js";


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
        showToast("Error in getFirstLetter:", error.message);
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
        };
        
        if (profileUsername) {
            profileUsername.textContent = data.username ? `${data.username.replace(/^@/, '')}` : "";
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

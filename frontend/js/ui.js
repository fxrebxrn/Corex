import { archiveNoteRequest, pinNoteRequest } from "./api.js";
import { renderPinnedNotesWithTags, renderRegularNotes, renderNavBarProfile } from "./notes.js";
import { openAttachTagModal } from "./tags.js";

const appModalsWindow = document.querySelector(".app-modals");
let currentNoteIdForMenu = null;
const optionsMenu = document.querySelector(".note-options-menu");


export const formatTimeAgo = (dateInput) => {
    if (!dateInput) return "";

    let dateStr = dateInput;
    
    if (typeof dateStr === 'string' && !dateStr.includes('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
        dateStr += 'Z';
    }

    const date = new Date(dateStr);
    const now = new Date();

    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 0) return "> 1 min. ago"; 

    if (diffInSeconds < 60) {
        return `> 1 min. ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} m. ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} h. ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays <= 3) {
        return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
};

export const setActiveNoteCard = (activeCard) => {
    const allCards = document.querySelectorAll(".note-card");
    
    allCards.forEach(card => {
        card.classList.remove("note-card-active");
    });

    if (activeCard) {
        activeCard.classList.add("note-card-active");
    }
};

export function showToast(message, type = 'error', duration = 4000) {
    const container = document.querySelector('#toast-container');

    const toast = document.createElement('div');
    toast.className = 'toast-notification ' + type;
    toast.textContent = message;

    container.appendChild(toast);

    const activeToasts = Array.from(container.querySelectorAll('.toast-notification:not(.is-closing)'));

    if (activeToasts.length > 3) {
        const excess = activeToasts.length - 3;
        for (let i = 0; i < excess; i++) {
            const oldest = activeToasts[i];
            
            oldest.classList.remove('show');
            oldest.classList.add('is-closing');
            
            setTimeout(() => oldest.remove(), 350); 
        }
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    setTimeout(() => {
        if (!toast.classList.contains('is-closing')) {
            toast.classList.remove('show');
            toast.classList.add('is-closing');
            
            setTimeout(() => toast.remove(), 350);
        }
    }, duration);
}

export const formatErrorMessage = (errorItem, fieldName) => {
    const friendlyName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    switch (errorItem.type) {
        case "string_too_short":
            return `${friendlyName} must be at least ${errorItem.ctx.min_length} characters`;
        case "string_too_long":
            return `${friendlyName} must be no more than ${errorItem.ctx.max_length} characters`;
        case "value_error":
            return errorItem.msg.replace("Value error, ", "");
        case "missing":
            return `${friendlyName} is required`;
        default:
            return errorItem.msg.replace("String", friendlyName);
    }
};

export const closeModal = (modal) => {
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
};

export const setCurrentNoteIdForMenu = (id) => {
    currentNoteIdForMenu = id;
};

export const initOptionsMenu = () => {
    if (!optionsMenu) return;

    document.addEventListener("click", (e) => {
        if (!optionsMenu.contains(e.target) && !e.target.closest(".note-card-options-btn")) {
            optionsMenu.classList.remove("is-open");
        }
    });

    const menuItems = optionsMenu.querySelectorAll(".menu-item");

    menuItems.forEach((item) => {
        item.addEventListener("click", async () => {
            const itemText = item.querySelector(".menu-item-text")?.textContent?.trim() || "";

            if (itemText === "Pin Note" || itemText === "Pin") {
                console.log("Pin Note clicked, ID:", currentNoteIdForMenu);
                await pinNoteRequest(localStorage.getItem("access_token"), currentNoteIdForMenu);
                await renderPinnedNotesWithTags();
                await renderRegularNotes(true);
            } else if (itemText === "Unpin") {
                console.log("Unpin clicked, ID:", currentNoteIdForMenu);
                await pinNoteRequest(localStorage.getItem("access_token"), currentNoteIdForMenu);
                await renderPinnedNotesWithTags();
                await renderRegularNotes(true);
            } else if (itemText === "Archive") {
                console.log("Archive clicked, ID:", currentNoteIdForMenu);
                await archiveNoteRequest(localStorage.getItem("access_token"), currentNoteIdForMenu);
                await renderPinnedNotesWithTags();
                await renderRegularNotes(true);
                await renderNavBarProfile();
            } else if (itemText === "Unarchive") {
                console.log("Unarchive clicked, ID:", currentNoteIdForMenu);
                await archiveNoteRequest(localStorage.getItem("access_token"), currentNoteIdForMenu);
                await renderPinnedNotesWithTags();
                await renderRegularNotes(true);
                await renderNavBarProfile();
            } else if (itemText === "Attach Tag") {
                console.log("Attach Tag clicked, ID:", currentNoteIdForMenu);
                const currentTagsRaw = optionsMenu.dataset.currentTags;
                const currentTags = currentTagsRaw ? JSON.parse(currentTagsRaw) : [];

                openAttachTagModal(currentNoteIdForMenu, currentTags, async () => {
                    await renderPinnedNotesWithTags();
                    await renderRegularNotes(true);
                });
            } else if (itemText === "Delete") {
                console.log("Delete clicked, ID:", currentNoteIdForMenu);
                
                const appModals = document.querySelector(".app-modals");
                const deleteModal = document.querySelector(".delete-note-modal");
                
                if (appModals && deleteModal) {
                    appModals.dataset.noteId = currentNoteIdForMenu;
                    appModals.classList.add("is-open");
                    deleteModal.classList.add("is-open");
                }
            }

            optionsMenu.classList.remove("is-open");
        });
    });
};

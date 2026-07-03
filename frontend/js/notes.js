import {
    getUserMeRequest, editUserProfileRequest, logoutRequest, getUserPinnedNotesRequest, deleteNoteRequest,
    syncNoteTagsRequest, getRegularNotesRequest, createNoteRequest, searchNotesRequest, getNoteRequest
} from "./api.js";
import { showToast, closeModal, setActiveNoteCard, setCurrentNoteIdForMenu, formatTimeAgo } from "./ui.js";
import { navigateTo } from "./router.js";
import { openNote, clearEditorIfNote, rehighlightCurrentCard, buildPreview, getCurrentNoteId, setEditorEmpty } from "./editor.js";
import { renderSidebarTags } from "./tags.js";

const appModalsWindow = document.querySelector(".app-modals");
const accountModal = document.querySelector(".account-modal");
const accountModalClose = document.querySelector(".account-form-cancel");
const accountModalLogout = document.querySelector(".account-form-logout");
const accountFrom = document.querySelector("#profile-form");
const optionsMenu = document.querySelector(".note-options-menu");
const deleteModal = document.querySelector(".delete-note-modal");
const confirmNoteBtnCancel = document.querySelector("#confirm-note-btn-cancel");
const confirmNoteBtnDelete = document.querySelector("#confirm-note-btn-delete");
const myProfileBtn = document.querySelector("#nav-userInfo");
const confirmTagsBtn = document.querySelector(".note-tags-submit");
const createNoteBtn = document.querySelector("#button-create-note-bottom");
const searchInput = document.querySelector(".search-input");

let userName = null;
let userUsername = null;

let currentCursor = null;
let hasMoreNotes = true;
let isFetchingNotes = false;
let scrollObserver = null;

let isSearchingMode = false;
let currentSearchQuery = "";
let searchDebounceTimeout = null;

let currentSearchCursor = null;
let hasMoreSearchNotes = true;
let isFetchingSearchNotes = false;
let searchScrollObserver = null;

let hasPinnedNotes = false;
let hasNotes = false;

const getNotesShell = () => document.querySelector(".notes-container");

const getOrCreateListContainer = (className) => {
    const notesShell = getNotesShell();
    if (!notesShell) return null;

    let container = notesShell.querySelector(`.${className}`);
    if (!container) {
        container = document.createElement("div");
        container.className = className;
        notesShell.appendChild(container);
    }

    return container;
};

const getPinnedContainer = () => getOrCreateListContainer("pinned-notes-container");
const getRegularContainer = () => getOrCreateListContainer("regular-notes-container");

const ensureNotesLayout = () => {
    const notesContainer = getNotesShell();
    if (!notesContainer) return { pinnedContainer: null, regularContainer: null };

    let pinnedContainer = notesContainer.querySelector(".pinned-notes-container");
    let regularContainer = notesContainer.querySelector(".regular-notes-container");

    const hadContainers = Boolean(pinnedContainer && regularContainer);

    if (!pinnedContainer) {
        pinnedContainer = document.createElement("div");
        pinnedContainer.className = "pinned-notes-container";
    }

    if (!regularContainer) {
        regularContainer = document.createElement("div");
        regularContainer.className = "regular-notes-container";
    }

    if (!hadContainers) {
        notesContainer.replaceChildren();
        notesContainer.appendChild(pinnedContainer);
        notesContainer.appendChild(regularContainer);
    }

    return { pinnedContainer, regularContainer };
};

const animateCardAppear = (card, isNew = false) => {
    if (!card) return;
    card.classList.add(isNew ? "is-new" : "is-adding");
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            card.classList.remove("is-adding");
            if (isNew) {
                card.classList.add("is-new-settle");
                const cleanup = () => {
                    card.classList.remove("is-new", "is-new-settle");
                };
                card.addEventListener("animationend", cleanup, { once: true });
                window.setTimeout(cleanup, 700);
            }
        });
    });
};

const animateCardRemoval = (card, onDone) => {
    if (!card) return;

    card.classList.add("is-removing");
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        card.remove();
        onDone?.();
        checkEmptyState();
    };

    card.addEventListener("transitionend", finish, { once: true });
    window.setTimeout(finish, 240);
};

const getTargetListContainer = (note) => {
    if (!note || note.is_archived) return null;
    return note.is_pinned ? getPinnedContainer() : getRegularContainer();
};

const syncCardState = (card, note) => {
    if (!card) return;

    const isPinned = Boolean(note?.is_pinned ?? card.dataset.isPinned === "true");
    const isArchived = Boolean(note?.is_archived ?? card.dataset.isArchived === "true");
    card.dataset.isPinned = String(isPinned);
    card.dataset.isArchived = String(isArchived);

    const pinIcon = card.querySelector(".note-card-pinned-icon");
    if (isPinned && !pinIcon) {
        const svgNS = "http://www.w3.org/2000/svg";
        const noteCardPinnedIcon = document.createElement("span");
        noteCardPinnedIcon.className = "note-card-pinned-icon";

        const pinSvg = document.createElementNS(svgNS, "svg");
        pinSvg.setAttribute("width", "1em");
        pinSvg.setAttribute("height", "1em");
        pinSvg.setAttribute("viewBox", "0 0 24 24");

        const pinTitle = document.createElementNS(svgNS, "title");
        pinTitle.textContent = "pin";

        const pinPath = document.createElementNS(svgNS, "path");
        pinPath.setAttribute("fill", "none");
        pinPath.setAttribute("stroke", "currentColor");
        pinPath.setAttribute("stroke-linecap", "round");
        pinPath.setAttribute("stroke-linejoin", "round");
        pinPath.setAttribute("stroke-width", "2");
        pinPath.setAttribute("d", "M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4a1 1 0 0 1 1 1z");

        pinSvg.append(pinTitle, pinPath);
        noteCardPinnedIcon.appendChild(pinSvg);
        card.querySelector(".note-card-title")?.prepend(noteCardPinnedIcon);
    } else if (!isPinned && pinIcon) {
        pinIcon.remove();
    }
};

const updateCardContent = (card, note) => {
    if (!card || !note) return;

    syncCardState(card, note);

    if (note.title !== undefined) {
        const titleEl = card.querySelector(".note-card-title p");
        if (titleEl) {
            titleEl.textContent = note.title || "Untitled";
        }
    }

    if (note.content !== undefined || note.pre_content !== undefined) {
        const previewEl = card.querySelector(".note-card-preview");
        if (previewEl) {
            previewEl.textContent = buildPreview(note.content ?? note.pre_content ?? "");
        }
    }

    if (Array.isArray(note.tags)) {
        card.dataset.currentTags = JSON.stringify(note.tags);
        const tagsContainer = card.querySelector(".note-card-tags");
        if (tagsContainer) {
            tagsContainer.replaceChildren();
            note.tags.forEach(tag => {
                const tagItem = document.createElement("span");
                tagItem.className = "note-tag";
                tagItem.textContent = tag.name;
                tagsContainer.appendChild(tagItem);
            });
        }
    }

    if (note.updated_at) {
        const timeEl = card.querySelector("time");
        if (timeEl) {
            timeEl.setAttribute("datetime", note.updated_at);
            timeEl.textContent = formatTimeAgo(note.updated_at);
        }
    }
};

export const applyNoteMutation = (noteLike, options = {}) => {
    const note = noteLike || {};
    const noteId = note.id;
    if (!noteId) return null;

    const card = document.getElementById(`note-${noteId}`);
    const targetContainer = getTargetListContainer(note);

    if (options.remove || note.is_archived) {
        if (card) {
            animateCardRemoval(card);
        }
        return card;
    }

    if (!card) {
        const createdCard = createNoteElement(note);
        const container = targetContainer || getRegularContainer();
        if (container) {
            if (options.prepend) {
                container.prepend(createdCard);
            } else {
                container.appendChild(createdCard);
            }
            animateCardAppear(createdCard, Boolean(options.isNew));
        }
        hasNotes = true;
        checkEmptyState();
        return createdCard;
    }

    updateCardContent(card, note);
    const currentContainer = card.closest(".pinned-notes-container, .regular-notes-container");
    if (targetContainer && currentContainer !== targetContainer) {
        targetContainer.prepend(card);
    } else if (targetContainer && options.prepend && card !== targetContainer.firstElementChild) {
        targetContainer.prepend(card);
    }

    return card;
};

export const fetchAndApplyNote = async (noteId, options = {}) => {
    if (!noteId) return null;

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        showToast("Access token not found in storage");
        return null;
    }

    const data = await getNoteRequest(accessToken, noteId);
    if (!data || !data.success) {
        showToast(data?.detail || "Failed to refresh note");
        return null;
    }

    applyNoteMutation(data, options);
    return data;
};

export const removeNoteCard = (noteId) => {
    const card = document.getElementById(`note-${noteId}`);
    if (card) {
        animateCardRemoval(card);
    }
};

export const createNoteElement = (note) => {
    const svgNS = "http://www.w3.org/2000/svg";
    const optionsMenu = document.querySelector(".note-options-menu");

    const noteCard = document.createElement("div");
    noteCard.className = "note-card";
    noteCard.id = `note-${note.id}`;
    noteCard.dataset.noteId = note.id;

    const noteCardHeader = document.createElement("header");
    noteCardHeader.className = "note-card-header";

    const noteCardTitle = document.createElement("h2");
    noteCardTitle.className = "note-card-title";

    if (note.is_pinned) {
        const noteCardPinnedIcon = document.createElement("span");
        noteCardPinnedIcon.className = "note-card-pinned-icon";

        const pinSvg = document.createElementNS(svgNS, "svg");
        pinSvg.setAttribute("width", "1em");
        pinSvg.setAttribute("height", "1em");
        pinSvg.setAttribute("viewBox", "0 0 24 24");

        const pinTitle = document.createElementNS(svgNS, "title");
        pinTitle.textContent = "pin";

        const pinPath = document.createElementNS(svgNS, "path");
        pinPath.setAttribute("fill", "none");
        pinPath.setAttribute("stroke", "currentColor");
        pinPath.setAttribute("stroke-linecap", "round");
        pinPath.setAttribute("stroke-linejoin", "round");
        pinPath.setAttribute("stroke-width", "2");
        pinPath.setAttribute("d", "M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4a1 1 0 0 1 1 1z");

        pinSvg.append(pinTitle, pinPath);
        noteCardPinnedIcon.appendChild(pinSvg);
        noteCardTitle.appendChild(noteCardPinnedIcon);
    }

    const noteCardTitleText = document.createElement("p");
    noteCardTitleText.textContent = note.title || "Untitled";

    noteCardTitle.appendChild(noteCardTitleText);

    const noteCardOptionsBtn = document.createElement("button");
    noteCardOptionsBtn.className = "note-card-options-btn";

    const optSvg = document.createElementNS(svgNS, "svg");
    optSvg.setAttribute("width", "1em");
    optSvg.setAttribute("height", "1em");
    optSvg.setAttribute("viewBox", "0 0 24 24");

    const optTitle = document.createElementNS(svgNS, "title");
    optTitle.textContent = "Options";

    const optGroup = document.createElementNS(svgNS, "g");
    optGroup.setAttribute("fill", "none");
    optGroup.setAttribute("stroke", "currentColor");
    optGroup.setAttribute("stroke-linecap", "round");
    optGroup.setAttribute("stroke-linejoin", "round");
    optGroup.setAttribute("stroke-width", "2");

    const circle1 = document.createElementNS(svgNS, "circle");
    circle1.setAttribute("cx", "12");
    circle1.setAttribute("cy", "12");
    circle1.setAttribute("r", "1");

    const circle2 = document.createElementNS(svgNS, "circle");
    circle2.setAttribute("cx", "12");
    circle2.setAttribute("cy", "5");
    circle2.setAttribute("r", "1");

    const circle3 = document.createElementNS(svgNS, "circle");
    circle3.setAttribute("cx", "12");
    circle3.setAttribute("cy", "19");
    circle3.setAttribute("r", "1");

    optGroup.append(circle1, circle2, circle3);
    optSvg.append(optTitle, optGroup);
    noteCardOptionsBtn.appendChild(optSvg);

    noteCardHeader.append(noteCardTitle, noteCardOptionsBtn);

    const noteCardPrev = document.createElement("p");
    noteCardPrev.className = "note-card-preview";
    noteCardPrev.textContent = buildPreview(note.content || note.pre_content || "");

    const noteCardTags = document.createElement("section");
    noteCardTags.className = "note-card-tags";

    const tags = note.tags || [];
    tags.forEach(tag => {
        const tagItem = document.createElement("span");
        tagItem.className = "note-tag";
        tagItem.textContent = tag.name;
        noteCardTags.appendChild(tagItem);
    });

    const noteCardFooter = document.createElement("footer");
    noteCardFooter.className = "note-card-footer";

    const noteCardFooterTime = document.createElement("time");
    const formattedDate = formatTimeAgo(note.updated_at);
    noteCardFooterTime.setAttribute("datetime", note.updated_at || "");
    noteCardFooterTime.textContent = formattedDate;

    noteCardFooter.appendChild(noteCardFooterTime);

    noteCard.append(noteCardHeader, noteCardPrev, noteCardTags, noteCardFooter);
    updateCardContent(noteCard, note);

    noteCard.addEventListener("click", () => {
        setActiveNoteCard(noteCard);
        openNote(note.id);
    });

    noteCardOptionsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!optionsMenu) return;

        if (optionsMenu.classList.contains("is-open") && optionsMenu.dataset.currentId == note.id) {
            optionsMenu.classList.remove("is-open");
            return;
        }

        setCurrentNoteIdForMenu(note.id);
        optionsMenu.dataset.currentId = note.id;
        optionsMenu.dataset.currentTags = noteCard.dataset.currentTags || JSON.stringify(note.tags || []);

        const isPinned = noteCard.dataset.isPinned === "true";
        const isArchived = noteCard.dataset.isArchived === "true";

        const pinTextSpan = optionsMenu.querySelector(".menu-item:nth-of-type(1) .menu-item-text");
        if (pinTextSpan) {
            pinTextSpan.textContent = isPinned ? "Unpin" : "Pin Note";
        }

        const archiveTextSpan = optionsMenu.querySelector(".menu-item:nth-of-type(2) .menu-item-text");
        if (archiveTextSpan) {
            archiveTextSpan.textContent = isArchived ? "Unarchive" : "Archive";
        }

        const btnRect = noteCardOptionsBtn.getBoundingClientRect();

        optionsMenu.style.visibility = "hidden";
        optionsMenu.style.display = "block";

        const menuWidth = 180;
        const menuHeight = optionsMenu.offsetHeight;

        let topPos = btnRect.bottom + window.scrollY + 5;
        let leftPos = btnRect.right + window.scrollX - menuWidth;

        if (topPos + menuHeight > window.innerHeight + window.scrollY) {
            topPos = btnRect.top + window.scrollY - menuHeight - 5;
            optionsMenu.style.transformOrigin = "bottom right";
        } else {
            optionsMenu.style.transformOrigin = "top right";
        }

        if (leftPos < window.scrollX) {
            leftPos = btnRect.left + window.scrollX;
            optionsMenu.style.transformOrigin = topPos < btnRect.top ? "bottom left" : "top left";
        }

        optionsMenu.style.top = `${topPos}px`;
        optionsMenu.style.left = `${leftPos}px`;
        optionsMenu.style.right = "auto";

        optionsMenu.style.visibility = "";
        optionsMenu.classList.add("is-open");
    });

    return noteCard;
};

export const checkEmptyState = () => {
    const notesContainer = document.querySelector(".notes-container");
    if (!notesContainer) return;

    const existingMessage = notesContainer.querySelector(".empty-notes-message");
    if (existingMessage) {
        existingMessage.remove();
    }

    const visibleCards = notesContainer.querySelectorAll(".note-card:not(.is-removing)").length;

    if (visibleCards === 0 && !isSearchingMode) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "empty-notes-message";
        emptyMessage.textContent = "You don't have any notes yet.";
        notesContainer.appendChild(emptyMessage);
    }
};

export const refreshAllNotes = async (options = {}) => {
    const { openNoteId = null, closeEditor = false } = options;

    isSearchingMode = false;
    currentSearchQuery = "";
    if (searchInput) searchInput.value = "";
    if (searchScrollObserver) {
        searchScrollObserver.disconnect();
        searchScrollObserver = null;
    }
    currentSearchCursor = null;
    hasMoreSearchNotes = true;
    isFetchingSearchNotes = false;

    try { await renderNavBarProfile(); } catch (e) {}
    try { await renderSidebarTags(); } catch (e) {}
    await renderPinnedNotesWithTags();
    await renderRegularNotes(true);

    if (closeEditor) {
        setEditorEmpty();
    } else {
        const targetId = openNoteId || getCurrentNoteId();
        if (targetId) {
            const card = document.getElementById(`note-${targetId}`);
            if (card) setActiveNoteCard(card);
            await openNote(targetId);
        }
    }

    checkEmptyState();
};

export const renderPinnedNotesWithTags = async () => {
    try {
        const notesContainer = getNotesShell();
        if (!notesContainer) return;

        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
            showToast("Access token not found in storage");
            return;
        }

        const data = await getUserPinnedNotesRequest(accessToken);

        if (!data || !data.success) {
            showToast(data?.detail || "Failed to fetch user notes");
            return;
        }

        const pinnedNotes = data.notes || [];
        const { pinnedContainer, regularContainer } = ensureNotesLayout();

        if (!pinnedContainer || !regularContainer) return;

        pinnedContainer.replaceChildren();

        if (pinnedNotes.length === 0) {
            hasPinnedNotes = false;
            return;
        }

        hasPinnedNotes = true;
        pinnedNotes.sort((a, b) => (a.pinned_position || 0) - (b.pinned_position || 0));
        pinnedNotes.forEach(note => {
            const noteCard = createNoteElement(note);
            pinnedContainer.appendChild(noteCard);
            animateCardAppear(noteCard);
        });

    } catch (error) {
        showToast(`Error in renderPinnedNotesWithTags: ${error.message}`);
    }
};

export const renderRegularNotes = async (reset = false) => {
    const notesContainer = getNotesShell();
    if (!notesContainer) return;

    const { regularContainer } = ensureNotesLayout();
    if (!regularContainer) return;

    if (reset) {
        currentCursor = null;
        hasMoreNotes = true;
        regularContainer.replaceChildren();
        if (scrollObserver) {
            scrollObserver.disconnect();
            scrollObserver = null;
        }
    }

    if (!hasMoreNotes || isFetchingNotes) return;

    isFetchingNotes = true;
    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
        showToast("Access token not found in storage");
        isFetchingNotes = false;
        return;
    }

    try {
        const data = await getRegularNotesRequest(accessToken, 50, currentCursor);

        if (!data || !data.success) {
            showToast(data?.detail || "Failed to fetch regular notes");
            return;
        }

        const regularNotes = data.items || [];

        if (regularNotes.length === 0) {
            hasNotes = false;
            checkEmptyState();
            return;
        }

        hasNotes = true;
        currentCursor = data.next_cursor;
        hasMoreNotes = data.has_more;

        regularNotes.forEach(note => {
            const noteCard = createNoteElement(note);
            regularContainer.appendChild(noteCard);
            animateCardAppear(noteCard);
        });

        setupInfiniteScroll(regularContainer);

        rehighlightCurrentCard();

        checkEmptyState();

    } catch (error) {
        showToast(`Error in renderRegularNotes: ${error.message}`);
    } finally {
        isFetchingNotes = false;
    }
};

const setupInfiniteScroll = (container) => {
    if (!hasMoreNotes) {
        if (scrollObserver) {
            scrollObserver.disconnect();
            scrollObserver = null;
        }
        const oldSentinel = container.querySelector("#notes-scroll-sentinel");
        if (oldSentinel) oldSentinel.remove();
        return;
    }

    let sentinel = container.querySelector("#notes-scroll-sentinel");
    if (!sentinel) {
        sentinel = document.createElement("div");
        sentinel.id = "notes-scroll-sentinel";
        sentinel.style.height = "1px";
        sentinel.style.width = "100%";
    }
    container.appendChild(sentinel);

    if (scrollObserver) {
        scrollObserver.disconnect();
    }

    scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreNotes && !isFetchingNotes) {
            renderRegularNotes(false);
        }
    }, {
        root: null,
        rootMargin: "200px",
        threshold: 0
    });

    scrollObserver.observe(sentinel);
};

export const renderSearchNotes = async (reset = false) => {
    const notesContainer = getNotesShell();
    if (!notesContainer) return;

    if (reset) {
        currentSearchCursor = null;
        hasMoreSearchNotes = true;

        const existingCards = Array.from(notesContainer.querySelectorAll(".note-card"));
        existingCards.forEach(card => {
            card.classList.add("is-removing");
        });

        window.setTimeout(() => {
            existingCards.forEach(card => card.remove());
        }, 150);

        if (searchScrollObserver) {
            searchScrollObserver.disconnect();
            searchScrollObserver = null;
        }
    }

    if (!hasMoreSearchNotes || isFetchingSearchNotes) return;

    isFetchingSearchNotes = true;
    const accessToken = localStorage.getItem("access_token");

    try {
        notesContainer.replaceChildren();

        const data = await searchNotesRequest(accessToken, currentSearchQuery, 50, currentSearchCursor);

        if (!data || !data.success) {
            showToast(data?.detail || "Search failed");
            return;
        }

        const searchNotes = data.items || [];
        currentSearchCursor = data.next_cursor;
        hasMoreSearchNotes = data.has_more;

        if (reset && searchNotes.length === 0) {
            const noResults = document.createElement("div");
            noResults.className = "no-search-results";
            noResults.textContent = "No results found";
            noResults.style.textAlign = "center";
            noResults.style.marginTop = "2rem";
            noResults.style.color = "var(--text-muted, #888)";

            notesContainer.appendChild(noResults);
        } else {
            searchNotes.forEach(note => {
                const noteCard = createNoteElement(note);
                notesContainer.appendChild(noteCard);
                animateCardAppear(noteCard);
            });

            setupSearchInfiniteScroll(notesContainer);
        }

    } catch (error) {
        showToast(`Error in search: ${error.message}`);
    } finally {
        isFetchingSearchNotes = false;
    }
};

const setupSearchInfiniteScroll = (container) => {
    if (!hasMoreSearchNotes) {
        if (searchScrollObserver) {
            searchScrollObserver.disconnect();
            searchScrollObserver = null;
        }
        const oldSentinel = container.querySelector("#search-scroll-sentinel");
        if (oldSentinel) oldSentinel.remove();
        return;
    }

    let sentinel = container.querySelector("#search-scroll-sentinel");
    if (!sentinel) {
        sentinel = document.createElement("div");
        sentinel.id = "search-scroll-sentinel";
        sentinel.style.height = "1px";
        sentinel.style.width = "100%";
    }
    container.appendChild(sentinel);

    if (searchScrollObserver) {
        searchScrollObserver.disconnect();
    }

    searchScrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreSearchNotes && !isFetchingSearchNotes) {
            renderSearchNotes(false);
        }
    }, {
        root: null,
        rootMargin: "200px",
        threshold: 0
    });

    searchScrollObserver.observe(sentinel);
};

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
            profileName.classList.remove("skeleton", "name-skeleton", "skeleton-text");
            profileNameInput.value = data.name || "";
            userName = data.name || "";
        };

        if (profileUsername) {
            profileUsername.textContent = data.username ? `${data.username.replace(/^@/, '')}` : "";
            profileUsernameInput.value = data.username ? `${data.username.replace(/^@/, '')}` : "";
            userUsername = data.username ? `${data.username.replace(/^@/, '')}` : "";

            const parent = profileUsername.closest(".nav-user-username");
            if (parent) {
                parent.classList.remove("skeleton", "username-skeleton", "skeleton-text");
            }
        };

        if (avatarElement && data.name) {
            avatarElement.textContent = getFirstLetter(data.name);
            avatarElement.classList.remove("skeleton", "avatar-skeleton", "skeleton-circle");
        };

        if (allNotesCount) {
            allNotesCount.textContent = data.all_notes_count;
        };

        if (archivedNotesCount) {
            archivedNotesCount.textContent = data.archived_notes_count;
        };

        const navUser = document.getElementById("nav-userInfo");
        if (navUser) {
            navUser.style.pointerEvents = "auto";
        }

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

if (confirmNoteBtnCancel && confirmNoteBtnDelete && deleteModal && appModalsWindow) {
    confirmNoteBtnCancel.addEventListener("click", () => {
        appModalsWindow.classList.remove("is-open");
        deleteModal.classList.remove("is-open");
        appModalsWindow.removeAttribute("data-note-id");
    });

    confirmNoteBtnDelete.addEventListener("click", async () => {
        const noteId = appModalsWindow.dataset.noteId;
        if (!noteId) return;

        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
            showToast("Access token not found");
            return;
        }

        try {
            const data = await deleteNoteRequest(accessToken, noteId);

                if (data && data.success) {
                showToast("Note deleted successfully", "success");

                const wasOpen = String(getCurrentNoteId()) === String(noteId);
                await refreshAllNotes({ closeEditor: wasOpen });
            } else {
                showToast(data?.detail || "Failed to delete note");
            }
        } catch (error) {
            showToast(`Error deleting note: ${error.message}`);
        } finally {
            appModalsWindow.classList.remove("is-open");
            deleteModal.classList.remove("is-open");
            appModalsWindow.removeAttribute("data-note-id");
        }
    });
}

createNoteBtn.addEventListener("click", async () => {
    try {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
            showToast("Access token not found");
            return;
        }

        const data = await createNoteRequest(accessToken);

            if (data && data.success) {
            showToast("Note created successfully", "success");

            const listResp = await getRegularNotesRequest(accessToken, 1);
            const newNote = listResp && listResp.success && Array.isArray(listResp.items)
                ? listResp.items[0]
                : null;

            await refreshAllNotes({ openNoteId: newNote?.id || null });
        } else {
            showToast(data?.detail || "Failed to create note");
        }
    } catch (error) {
        showToast(`Error creating note: ${error.message}`);
    }
});

if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchDebounceTimeout);

        if (query.length >= 3) {
            searchDebounceTimeout = setTimeout(() => {
                isSearchingMode = true;
                currentSearchQuery = query;
                renderSearchNotes(true);
            }, 250);

        } else if (query.length === 0 && isSearchingMode) {
            isSearchingMode = false;
            currentSearchQuery = "";

            if (searchScrollObserver) {
                searchScrollObserver.disconnect();
                searchScrollObserver = null;
            }

            renderPinnedNotesWithTags().then(() => {
                renderRegularNotes(true);
            });
        }
    });
}

export const showAppSkeletons = () => {
    const notesContainer = document.querySelector(".notes-container");
    const tagsList = document.querySelector(".nav-tags-list");
    const navUser = document.querySelector("#nav-userInfo");

    if (tagsList) {
        tagsList.innerHTML = `
            <li class="nav-tag-item">
                <a href="#" class="nav-tag-link" style="pointer-events: none;">
                    <span class="nav-tag-dot skeleton skeleton-circle" style="width: 7px; height: 7px;"></span>
                    <span class="nav-tag-name skeleton skeleton-text" style="width: 55%; height: 12px; margin-bottom: 0;"></span>
                </a>
            </li>
            <li class="nav-tag-item">
                <a href="#" class="nav-tag-link" style="pointer-events: none;">
                    <span class="nav-tag-dot skeleton skeleton-circle" style="width: 7px; height: 7px;"></span>
                    <span class="nav-tag-name skeleton skeleton-text" style="width: 40%; height: 12px; margin-bottom: 0;"></span>
                </a>
            </li>
            <li class="nav-tag-item">
                <a href="#" class="nav-tag-link" style="pointer-events: none;">
                    <span class="nav-tag-dot skeleton skeleton-circle" style="width: 7px; height: 7px;"></span>
                    <span class="nav-tag-name skeleton skeleton-text" style="width: 65%; height: 12px; margin-bottom: 0;"></span>
                </a>
            </li>
        `;
    }

    if (notesContainer) {
        notesContainer.replaceChildren();
        notesContainer.innerHTML = `
            <div class="note-card-skeleton">
                <div class="note-card-skeleton-header">
                    <span class="skeleton skeleton-text" style="width: 60%; height: 13px;"></span>
                    <span class="skeleton skeleton-circle" style="width: 14px; height: 14px;"></span>
                </div>
                <div class="skeleton skeleton-text" style="width: 90%; height: 11px; margin-top: 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 80%; height: 11px; margin-top: 5px;"></div>
                <div class="note-card-skeleton-tags">
                    <span class="skeleton skeleton-tag" style="width: 45px; height: 15px;"></span>
                    <span class="skeleton skeleton-tag" style="width: 35px; height: 15px;"></span>
                </div>
                <div class="note-card-skeleton-footer">
                    <span class="skeleton skeleton-text" style="width: 25%; height: 9px; margin-bottom: 0;"></span>
                </div>
            </div>
            <div class="note-card-skeleton">
                <div class="note-card-skeleton-header">
                    <span class="skeleton skeleton-text" style="width: 75%; height: 13px;"></span>
                    <span class="skeleton skeleton-circle" style="width: 14px; height: 14px;"></span>
                </div>
                <div class="skeleton skeleton-text" style="width: 85%; height: 11px; margin-top: 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 45%; height: 11px; margin-top: 5px;"></div>
                <div class="note-card-skeleton-tags">
                    <span class="skeleton skeleton-tag" style="width: 40px; height: 15px;"></span>
                </div>
                <div class="note-card-skeleton-footer">
                    <span class="skeleton skeleton-text" style="width: 30%; height: 9px; margin-bottom: 0;"></span>
                </div>
            </div>
            <div class="note-card-skeleton">
                <div class="note-card-skeleton-header">
                    <span class="skeleton skeleton-text" style="width: 50%; height: 13px;"></span>
                    <span class="skeleton skeleton-circle" style="width: 14px; height: 14px;"></span>
                </div>
                <div class="skeleton skeleton-text" style="width: 92%; height: 11px; margin-top: 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 70%; height: 11px; margin-top: 5px;"></div>
                <div class="note-card-skeleton-tags">
                    <span class="skeleton skeleton-tag" style="width: 50px; height: 15px;"></span>
                    <span class="skeleton skeleton-tag" style="width: 40px; height: 15px;"></span>
                </div>
                <div class="note-card-skeleton-footer">
                    <span class="skeleton skeleton-text" style="width: 20%; height: 9px; margin-bottom: 0;"></span>
                </div>
            </div>
            <div class="note-card-skeleton">
                <div class="note-card-skeleton-header">
                    <span class="skeleton skeleton-text" style="width: 65%; height: 13px;"></span>
                    <span class="skeleton skeleton-circle" style="width: 14px; height: 14px;"></span>
                </div>
                <div class="skeleton skeleton-text" style="width: 88%; height: 11px; margin-top: 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 60%; height: 11px; margin-top: 5px;"></div>
                <div class="note-card-skeleton-tags">
                    <span class="skeleton skeleton-tag" style="width: 35px; height: 15px;"></span>
                </div>
                <div class="note-card-skeleton-footer">
                    <span class="skeleton skeleton-text" style="width: 25%; height: 9px; margin-bottom: 0;"></span>
                </div>
            </div>
        `;
    }

    if (navUser) {
        navUser.style.pointerEvents = "none";
        navUser.innerHTML = `
            <div class="nav-user-avatar skeleton avatar-skeleton skeleton-circle"></div>
            <div class="nav-user-info">
                <span class="nav-user-name skeleton name-skeleton skeleton-text"></span>
                <span class="nav-user-username skeleton username-skeleton skeleton-text">@<span class="user-username"></span></span>
            </div>
        `;
    }
};

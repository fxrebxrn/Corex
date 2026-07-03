import {
    getNoteRequest,
    finalizeNoteRequest,
    pinNoteRequest,
    archiveNoteRequest,
    API_URL
} from "./api.js";
import { showToast, setActiveNoteCard, formatTimeAgo, updateOptionsMenuState } from "./ui.js";
import { renderNavBarProfile, removeNoteCard, checkEmptyState, refreshAllNotes } from "./notes.js";
import { openAttachTagModal } from "./tags.js";
import { createMarkdownEditor } from "./markdown_editor.js";


const editorArea = document.querySelector(".editor-area");
const titleInput = document.querySelector(".editor-note-title-input");
const cmHost = document.querySelector(".editor-cm-host");
const pinBtn = document.querySelector("#note-pin");
const archiveBtn = document.querySelector("#note-archive");
const deleteBtn = document.querySelector("#note-delete");
const editorTagsContainer = document.querySelector(".editor-tags-container");
const createdAtEl = document.querySelector(".editor-created-at");
const updatedAtEl = document.querySelector(".editor-updated-at");
const saveStatusEl = document.querySelector(".editor-save-status");
const saveDividerEl = document.querySelector(".editor-save-divider");
const appModalsWindow = document.querySelector(".app-modals");
const deleteModal = document.querySelector(".delete-note-modal");

let editor = null;
let emptyStateEl = null;
let currentNoteId = null;
let currentNoteData = null;
let saveTimeout = null;
let isSaving = false;
let isLoadingNote = false;


export const initEditor = () => {
    editor = createMarkdownEditor({
        parent: cmHost,
        doc: "",
        placeholder: "",
        onChange: () => scheduleSave(),
        onSave: () => {
            if (!currentNoteId) return;
            clearTimeout(saveTimeout);
            saveTimeout = null;
            saveCurrentNote();
        },
    });

    titleInput.addEventListener("input", () => scheduleSave());

    if (pinBtn) pinBtn.addEventListener("click", handlePin);
    if (archiveBtn) archiveBtn.addEventListener("click", handleArchive);
    if (deleteBtn) deleteBtn.addEventListener("click", handleDelete);

    const moreTagsBtn = document.querySelector(".more-tags-btn");
    if (moreTagsBtn) moreTagsBtn.addEventListener("click", handleAddTag);

    window.addEventListener("beforeunload", flushSaveOnUnload);

    buildEmptyState();
    setEditorEmpty();
};


export const openNote = async (noteId) => {
    if (isLoadingNote) return;
    isLoadingNote = true;

    try {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
            await saveCurrentNote();
        }

        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
            showToast("Access token not found");
            return;
        }

        const data = await getNoteRequest(accessToken, noteId);
        if (!data || !data.success) {
            showToast(data?.detail || "Failed to load note");
            return;
        }

        currentNoteId = noteId;
        currentNoteData = data;

        titleInput.value = data.title || "";
        titleInput.disabled = false;

        editor.setValue(data.content || "");
        editor.setEditable(true);

        renderEditorTags(data.tags || []);
        updateEditorFooter(data);
        updateActionButtons(data);
        enableEditorActions(true);
        showSaveStatus("idle");
        hideEmptyState();

    } catch (error) {
        showToast(`Error opening note: ${error.message}`);
    } finally {
        isLoadingNote = false;
    }
};


export const clearEditorIfNote = (noteId) => {
    if (String(currentNoteId) === String(noteId)) {
        setEditorEmpty();
    }
};


export const getCurrentNoteId = () => currentNoteId;


const scheduleSave = () => {
    if (!currentNoteId) return;
    clearTimeout(saveTimeout);
    showSaveStatus("editing");
    saveTimeout = setTimeout(async () => {
        await saveCurrentNote();
    }, 3000);
};


const saveCurrentNote = async () => {
    if (!currentNoteId || isSaving) return;

    const title = titleInput.value.trim();
    const content = editor.getValue();

    isSaving = true;
    showSaveStatus("saving");

    const accessToken = localStorage.getItem("access_token");

    try {
        const data = await finalizeNoteRequest(accessToken, currentNoteId, title, content);

        if (data && data.success && data.deleted) {
            const deletedId = currentNoteId;
            removeNoteCard(deletedId);
            setEditorEmpty();
            try { await renderNavBarProfile(); } catch (e) {}
            checkEmptyState();
        } else if (data && data.success) {
            const updatedAt = data.updated_at || new Date().toISOString();
            if (currentNoteData) currentNoteData.updated_at = updatedAt;
            showSaveStatus("saved");
            updateUpdatedAtFooter(updatedAt);
            updateNoteCardInSidebar(currentNoteId, title, content, updatedAt);
        } else {
            showToast(data?.detail || "Failed to save note");
            showSaveStatus("error");
        }
    } catch (error) {
        showToast(`Error saving: ${error.message}`);
        showSaveStatus("error");
    } finally {
        isSaving = false;
    }
};


const flushSaveOnUnload = () => {
    if (!saveTimeout || !currentNoteId) return;
    clearTimeout(saveTimeout);
    saveTimeout = null;

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    const title = titleInput.value.trim();
    const content = editor ? editor.getValue() : "";

    fetch(`${API_URL}/notes/${currentNoteId}/finalize`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ title, content }),
        keepalive: true
    });
};


export const buildPreview = (md, limit = 60) => {
    if (!md) return "";
    let text = md
        .replace(/```[^\n]*\n?([\s\S]*?)```/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^\s*>+\s?/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/^\s*\d+\.\s+/gm, "")
        .replace(/^\s*-{3,}\s*$/gm, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/__(.+?)__/g, "$1")
        .replace(/_(.+?)_/g, "$1")
        .replace(/~~(.+?)~~/g, "$1")
        .replace(/!\[.*?\]\(.+?\)/g, "")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim();

    if (text.length > limit) {
        text = text.slice(0, limit).trimEnd() + "...";
    }
    return text;
};


const showSaveStatus = (status) => {
    if (!saveStatusEl) return;

    const show = (text) => {
        saveStatusEl.textContent = text;
        if (saveDividerEl) saveDividerEl.style.display = text ? "" : "none";
    };

    switch (status) {
        case "editing": show("Editing..."); break;
        case "saving": show("Saving..."); break;
        case "saved":
            show("Saved ✓");
            setTimeout(() => {
                if (saveStatusEl.textContent === "Saved ✓") show("");
            }, 2500);
            break;
        case "error": show("Save failed"); break;
        default: show("");
    }
};


const updateUpdatedAtFooter = (updatedAt) => {
    if (updatedAtEl && updatedAt) {
        updatedAtEl.textContent = `Updated ${formatTimeAgo(updatedAt)}`;
    }
};


const updateNoteCardInSidebar = (noteId, title, content, updatedAt) => {
    const card = document.getElementById(`note-${noteId}`);
    if (!card) return;

    const pEl = card.querySelector(".note-card-title p");
    if (pEl) pEl.textContent = title || "Untitled";

    const previewEl = card.querySelector(".note-card-preview");
    if (previewEl) {
        previewEl.textContent = buildPreview(content);
        previewEl.classList.remove("is-fresh");
        requestAnimationFrame(() => previewEl.classList.add("is-fresh"));
    }

    const timeEl = card.querySelector("time");
    if (timeEl) {
        const stamp = updatedAt || new Date().toISOString();
        timeEl.setAttribute("datetime", stamp);
        timeEl.textContent = formatTimeAgo(stamp);
        timeEl.classList.remove("is-updating");
        requestAnimationFrame(() => timeEl.classList.add("is-updating"));
    }

    if (!currentNoteData?.is_pinned) {
        const regularContainer = document.querySelector(".regular-notes-container");
        if (regularContainer && card.parentElement === regularContainer && regularContainer.firstElementChild !== card) {
            regularContainer.prepend(card);
        }
    }
};


const renderEditorTags = (tags) => {
    if (!editorTagsContainer) return;

    editorTagsContainer.innerHTML = "";

    tags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "note-tag";
        span.textContent = tag.name;
        editorTagsContainer.appendChild(span);
    });

    const addTagSpan = document.createElement("span");
    addTagSpan.className = "tag";
    addTagSpan.innerHTML = `
        <button class="more-tags-btn" title="Add tag">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                <title>Add tag</title>
                <path fill="none" stroke="currentColor" stroke-linecap="round"
                      stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7v14"/>
            </svg>
            Tag
        </button>
    `;
    editorTagsContainer.appendChild(addTagSpan);

    addTagSpan.querySelector(".more-tags-btn")?.addEventListener("click", handleAddTag);
};


const updateEditorFooter = (noteData) => {
    if (createdAtEl && noteData.created_at) {
        const d = new Date(noteData.created_at);
        createdAtEl.textContent = `Created ${d.toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric"
        })}`;
    }
    if (updatedAtEl && noteData.updated_at) {
        updatedAtEl.textContent = `Updated ${formatTimeAgo(noteData.updated_at)}`;
    }
};


const updateActionButtons = (noteData) => {
    if (pinBtn) {
        const textNode = getLastTextNode(pinBtn);
        if (textNode) textNode.textContent = noteData.is_pinned ? " Unpin" : " Pin";
        pinBtn.title = noteData.is_pinned ? "Unpin" : "Pin";
        pinBtn.classList.toggle("is-active", !!noteData.is_pinned);
    }
    if (archiveBtn) {
        const textNode = getLastTextNode(archiveBtn);
        if (textNode) textNode.textContent = noteData.is_archived ? " Unarchive" : " Archive";
        archiveBtn.title = noteData.is_archived ? "Unarchive" : "Archive";
        archiveBtn.classList.toggle("is-active", !!noteData.is_archived);
    }
};


const getLastTextNode = (el) => {
    for (let i = el.childNodes.length - 1; i >= 0; i--) {
        if (el.childNodes[i].nodeType === Node.TEXT_NODE) return el.childNodes[i];
    }
    return null;
};


const enableEditorActions = (enabled) => {
    [pinBtn, archiveBtn, deleteBtn].forEach(btn => {
        if (btn) btn.disabled = !enabled;
    });
    titleInput.disabled = !enabled;
};


const buildEmptyState = () => {
    if (!editorArea) return;
    emptyStateEl = document.createElement("div");
    emptyStateEl.className = "editor-empty-state";
    emptyStateEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="1.5" d="M14 3v4a1 1 0 0 0 1 1h4M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-4-4H7a2 2 0 0 0-2 2zm4 9h6m-6-4h4"/>
        </svg>
        <p>Select a note to start editing</p>
    `;
    editorArea.appendChild(emptyStateEl);
};


const showEmptyState = () => { if (emptyStateEl) emptyStateEl.classList.add("is-visible"); };
const hideEmptyState = () => { if (emptyStateEl) emptyStateEl.classList.remove("is-visible"); };


export const setEditorEmpty = () => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }

    currentNoteId = null;
    currentNoteData = null;

    titleInput.value = "";
    titleInput.disabled = true;

    if (editor) {
        editor.setValue("");
        editor.setEditable(false);
    }

    enableEditorActions(false);

    if (editorTagsContainer) editorTagsContainer.innerHTML = "";
    if (createdAtEl) createdAtEl.textContent = "";
    if (updatedAtEl) updatedAtEl.textContent = "";
    showSaveStatus("idle");
    showEmptyState();
};


export const rehighlightCurrentCard = () => {
    if (!currentNoteId) return;
    const card = document.getElementById(`note-${currentNoteId}`);
    if (card) setActiveNoteCard(card);
};


const handlePin = async () => {
    if (!currentNoteId) return;

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) { showToast("Access token not found"); return; }

    try {
        const data = await pinNoteRequest(accessToken, currentNoteId);
        if (data && data.success) {
            await refreshAllNotes();
            showToast(currentNoteData?.is_pinned ? "Note pinned" : "Note unpinned", "success");
        } else {
            showToast(data?.detail || "Failed to pin note");
        }
    } catch (error) {
        showToast(`Error: ${error.message}`);
    }
};


const handleArchive = async () => {
    if (!currentNoteId) return;

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) { showToast("Access token not found"); return; }

    try {
        const data = await archiveNoteRequest(accessToken, currentNoteId);
        if (data && data.success) {
            await refreshAllNotes();
            showToast(currentNoteData?.is_archived ? "Note archived" : "Note unarchived", "success");
        } else {
            showToast(data?.detail || "Failed to archive note");
        }
    } catch (error) {
        showToast(`Error: ${error.message}`);
    }
};


const handleDelete = () => {
    if (!currentNoteId) return;

    if (appModalsWindow && deleteModal) {
        appModalsWindow.dataset.noteId = currentNoteId;
        appModalsWindow.classList.add("is-open");
        deleteModal.classList.add("is-open");
    }
};


const handleAddTag = () => {
    if (!currentNoteId || !currentNoteData) return;

    openAttachTagModal(currentNoteId, currentNoteData.tags || [], (updatedNote) => {
        if (updatedNote) {
            currentNoteData = updatedNote;
            renderEditorTags(updatedNote.tags || []);
            updateOptionsMenuState(updatedNote.id);
        }
        rehighlightCurrentCard();
    });
};

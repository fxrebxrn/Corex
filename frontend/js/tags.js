import { getUserTagsRequest, deleteTagRequest, createTagRequest, syncNoteTagsRequest, getNoteRequest } from "./api.js";
import { showToast, closeModal } from "./ui.js";
import { applyNoteMutation, handleTagSelection, resetToAllNotes, getCurrentTagId } from "./notes.js";

const appModalsWindow = document.querySelector(".app-modals");
const deleteTagModal = document.querySelector(".delete-tag-modal");
const confirmBtnCancel = document.querySelector("#confirm-tag-btn-cancel");
const confirmBtnDelete = document.querySelector("#confirm-tag-btn-delete");

const createTagModal = document.querySelector(".tag-modal");
const createTagForm = document.querySelector(".tag-form");
const createTagBtnCancel = document.querySelector(".tag-form-cancel");
const createTagBtn = document.querySelector(".nav-tags-add-btn");

let tagToDeleteId = null;

createTagBtn.addEventListener("click", () => {
    appModalsWindow.classList.add("is-open");
    createTagModal.classList.add("is-open");
});

createTagForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
        showToast("Access token not found");
        return;
    };

    const createTagNameInput = document.querySelector("#tag-name-input");

    if (!createTagNameInput.value) {
        showToast("Tag name is required");
        return;
    };

    const data = await createTagRequest(accessToken, createTagNameInput.value);

    if (!data || !data.success) {
        showToast(data?.detail || "Failed to create tag");
        return;
    };

    closeModal(createTagModal);
    renderSidebarTags();
    showToast("Tag created successfully", "success");
});

createTagBtnCancel.addEventListener("click", () => {
    closeModal(createTagModal);
});

confirmBtnCancel.addEventListener("click", () => { closeModal(deleteTagModal) });

confirmBtnDelete.addEventListener("click", async () => {
    if (!tagToDeleteId) return;

    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
        showToast("Access token not found");
        return;
    }

    const data = await deleteTagRequest(tagToDeleteId, accessToken);

    if (!data || !data.success) {
        showToast(data?.detail || "Failed to delete tag");
        return;
    }

    closeModal(deleteTagModal);
    renderSidebarTags();
    await resetToAllNotes();
    showToast("Tag deleted successfully", "success");
});

export const renderSidebarTags = async () => {
    try {
        const tagsList = document.querySelector(".nav-tags-list");

        if (!tagsList) return;

        const accessToken = localStorage.getItem("access_token");

        if (!accessToken) {
            showToast("Access token not found in storage");
            return;
        }

        const data = await getUserTagsRequest(accessToken);

        if (!data || !data.success) {
            showToast(data?.detail || "Failed to fetch user tags");
            return;
        }

        const tags = data.tags || [];

        tags.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        tagsList.querySelectorAll(".nav-tag-item").forEach((item) => item.classList.add("is-removing"));
        window.setTimeout(() => {
            tagsList.replaceChildren();

            if (tags.length === 0) {
                const noTags = document.createElement("h2");
                noTags.className = "no-tags-title";
                noTags.textContent = "No tags";
                tagsList.appendChild(noTags);
                return;
            }

            tags.forEach(tag => {
                const liItem = document.createElement("li");
                liItem.className = "nav-tag-item";

                const aLink = document.createElement("a");
                aLink.href = "#";
                aLink.className = "nav-tag-link";
                aLink.dataset.tag = tag.name.toLowerCase();

                const spanDot = document.createElement("span");
                spanDot.className = "nav-tag-dot";

                const spanName = document.createElement("span");
                spanName.className = "nav-tag-name";
                spanName.textContent = tag.name;

                const removeBtn = document.createElement("button");
                removeBtn.className = "nav-tag-remove-btn";
                removeBtn.title = "Remove filter";

                removeBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    tagToDeleteId = tag.id;
                    appModalsWindow.classList.add("is-open");
                    deleteTagModal.classList.add("is-open");
                });

                const svgNS = "http://www.w3.org/2000/svg";
                const svgIcon = document.createElementNS(svgNS, "svg");
                svgIcon.setAttribute("width", "1em");
                svgIcon.setAttribute("height", "1em");
                svgIcon.setAttribute("viewBox", "0 0 24 24");

                const pathInfo = document.createElementNS(svgNS, "path");
                pathInfo.setAttribute("fill", "none");
                pathInfo.setAttribute("stroke", "currentColor");
                pathInfo.setAttribute("stroke-linecap", "round");
                pathInfo.setAttribute("stroke-linejoin", "round");
                pathInfo.setAttribute("stroke-width", "2");
                pathInfo.setAttribute("d", "M18 6 6 18M6 6l12 12");

                liItem.addEventListener("click", async (e) => {
                    e.preventDefault();
                    document.querySelectorAll(".nav-tag-item").forEach(t => t.classList.remove("nav-item-active"));
                    liItem.classList.add("nav-item-active");
                    await handleTagSelection(tag.id);
                });

                svgIcon.appendChild(pathInfo);
                removeBtn.appendChild(svgIcon);

                aLink.append(spanDot, spanName, removeBtn);
                liItem.appendChild(aLink);

                tagsList.appendChild(liItem);
            });
        }, 120);


    } catch (error) {
        showToast("Could not load tags information");
    }
};

export const openAttachTagModal = async (noteId, currentTags, onSuccess) => {
    const appModalsWindow = document.querySelector(".app-modals");
    const noteTagsModal = document.querySelector(".note-tags-modal");
    const tagsListContainer = document.querySelector(".note-tags-list");
    const cancelBtn = document.querySelector(".note-tags-cancel");
    const submitBtn = document.querySelector(".note-tags-submit");

    if (!noteTagsModal || !appModalsWindow) return;

    appModalsWindow.classList.add("is-open");
    noteTagsModal.classList.add("is-open");

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        showToast("Access token not found");
        return;
    }

    const data = await getUserTagsRequest(accessToken);
    if (!data || !data.success) {
        showToast(data?.detail || "Failed to load tags");
        return;
    }

    const allTags = data.tags || [];
    let effectiveCurrentTags = Array.isArray(currentTags) ? currentTags : [];
    const noteForTags = await getNoteRequest(accessToken, noteId);
    if (noteForTags && noteForTags.success && Array.isArray(noteForTags.tags)) {
        effectiveCurrentTags = noteForTags.tags;
    }
    const currentTagIds = effectiveCurrentTags.map(t => t.id);

    tagsListContainer.replaceChildren();
    tagsListContainer.innerHTML = "";

    allTags.forEach((tag, index) => {
        const label = document.createElement("label");
        label.className = "tag-select-item";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = "note-tag";
        input.value = tag.id;
        input.checked = currentTagIds.includes(tag.id);

        const dotSpan = document.createElement("span");
        dotSpan.className = `tag-select-dot is-blue`;

        const nameSpan = document.createElement("span");
        nameSpan.className = "tag-select-name";
        nameSpan.textContent = tag.name;

        const boxSpan = document.createElement("span");
        boxSpan.className = "tag-select-box";

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 12 12");

        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M2 6.5L4.5 9L10 3");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");

        svg.appendChild(path);
        boxSpan.appendChild(svg);

        label.append(input, dotSpan, nameSpan, boxSpan);
        tagsListContainer.appendChild(label);
    });

    cancelBtn.onclick = () => {
        closeModal(noteTagsModal);
    };

    submitBtn.onclick = async () => {
        const checkedInputs = Array.from(tagsListContainer.querySelectorAll("input:checked"));
        const selectedTagIds = checkedInputs.map(input => parseInt(input.value));

        try {
            submitBtn.disabled = true;
            const response = await syncNoteTagsRequest(accessToken, noteId, selectedTagIds);

            if (response && response.success) {
                const noteResp = await getNoteRequest(accessToken, noteId);
                let updatedNote = null;
                if (noteResp && noteResp.success) {
                    updatedNote = noteResp;
                    applyNoteMutation(noteResp, {});
                }
                showToast("Tags updated successfully", "success");
                closeModal(noteTagsModal);
                if (onSuccess) onSuccess(updatedNote);
            } else {
                showToast(response?.detail || "Failed to update tags");
            }
        } catch (error) {
            showToast("Failed to update tags");
        } finally {
            submitBtn.disabled = false;
        }
    };
};

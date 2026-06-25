import { getUserTagsRequest, deleteTagRequest, createTagRequest } from "./api.js";
import { showToast, closeModal } from "./ui.js";

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

confirmBtnCancel.addEventListener("click", () => {closeModal(deleteTagModal)});

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

        tagsList.replaceChildren();

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

            svgIcon.appendChild(pathInfo);
            removeBtn.appendChild(svgIcon);

            aLink.append(spanDot, spanName, removeBtn);
            liItem.appendChild(aLink);
            
            tagsList.appendChild(liItem);
        });

    } catch (error) {
        showToast("Could not load tags information");
    }
};

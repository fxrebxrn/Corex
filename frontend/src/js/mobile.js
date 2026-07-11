const PHONE_QUERY = "(max-width: 767px)";

const isPhone = () => window.matchMedia(PHONE_QUERY).matches;

const getAppContainer = () => document.querySelector(".app-container");

const openEditorPane = () => {
    const container = getAppContainer();
    if (!container || !isPhone()) return;
    container.classList.add("is-editor-open");
};

const closeEditorPane = () => {
    const container = getAppContainer();
    if (!container) return;
    container.classList.remove("is-editor-open");
};

export const initMobile = () => {
    const notesContainer = document.querySelector(".notes-container");
    const createBtn = document.getElementById("button-create-note-bottom");
    const backBtn = document.querySelector(".editor-mobile-back");

    if (notesContainer) {
        notesContainer.addEventListener("click", (event) => {
            if (!isPhone()) return;
            const card = event.target.closest(".note-card");
            if (!card) return;
            if (event.target.closest(".note-card-options-btn")) return;
            openEditorPane();
        });
    }

    if (createBtn) {
        createBtn.addEventListener("click", () => {
            if (!isPhone()) return;
            openEditorPane();
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", closeEditorPane);
    }

    window.matchMedia(PHONE_QUERY).addEventListener("change", (event) => {
        if (!event.matches) closeEditorPane();
    });
};

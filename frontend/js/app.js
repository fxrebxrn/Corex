import { renderRoute } from "./router.js";
import { initOptionsMenu } from "./ui.js";
import { initEditor } from "./editor.js";
import { initLanding } from "./landing.js";

import './auth.js';
import './notes.js';
import './tags.js';

const initResizer = () => {
    const resizer = document.getElementById("central-resizer");
    const appContainer = document.querySelector(".app-container");
    const notesSidebar = document.querySelector(".notes-sidebar");

    if (!resizer || !appContainer || !notesSidebar) return;

    const minWidth = 240;
    const maxWidth = Math.max(minWidth + 120, Math.floor(window.innerWidth * 0.45));
    const storedWidth = Number(localStorage.getItem("notes_sidebar_width"));

    const applySidebarWidth = (width) => {
        const clamped = Math.min(Math.max(width, minWidth), maxWidth);
        notesSidebar.style.width = `${clamped}px`;
        notesSidebar.style.minWidth = `${clamped}px`;
        notesSidebar.style.flex = "0 0 auto";
        document.documentElement.style.setProperty("--app-notes-sidebar-w", `${clamped}px`);
        localStorage.setItem("notes_sidebar_width", String(clamped));
    };

    if (storedWidth) {
        applySidebarWidth(storedWidth);
    }

    let isDragging = false;
    let dragStartX = 0;
    let dragStartWidth = 0;

    const stopDragging = () => {
        if (!isDragging) return;
        isDragging = false;
        resizer.classList.remove("is-active");
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
    };

    resizer.addEventListener("mousedown", (event) => {
        event.preventDefault();
        isDragging = true;
        dragStartX = event.clientX;
        dragStartWidth = notesSidebar.getBoundingClientRect().width;
        resizer.classList.add("is-active");
        document.body.style.userSelect = "none";
        document.body.style.cursor = "ew-resize";
    });

    window.addEventListener("mousemove", (event) => {
        if (!isDragging) return;

        const delta = event.clientX - dragStartX;
        const nextWidth = dragStartWidth + delta;
        const movementThreshold = 3;

        if (Math.abs(delta) < movementThreshold) return;

        applySidebarWidth(nextWidth);
    });

    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("mouseleave", stopDragging);
    window.addEventListener("blur", stopDragging);
};

const initApp = () => {
    initEditor();
    initResizer();
    initLanding();
    renderRoute();
    initOptionsMenu();
};

window.addEventListener("popstate", renderRoute);
document.addEventListener("DOMContentLoaded", initApp);

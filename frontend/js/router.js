import { renderNavBarProfile, renderPinnedNotesWithTags } from "./notes.js";
import { tokenCheckRequest } from "./api.js";
import { refreshToken } from "./storage.js";
import { renderSidebarTags } from "./tags.js";


export const navigateTo = (path, replace = false) => {
    if (replace) {
        window.history.replaceState({}, "", path);
    } else {
        window.history.pushState({}, "", path);
    };
    renderRoute();
};

export const renderRoute = async () => {
    let path = window.location.pathname;
    const accessToken = localStorage.getItem("access_token");
    const refresh_token = localStorage.getItem("refresh_token");

    let isAuthenticated = false;

    if (accessToken || refresh_token) {
        const checkData = await tokenCheckRequest(accessToken);

        if (checkData.success) {
            isAuthenticated = true;
        } else if (refresh_token) {
            const isRefreshed = await refreshToken(refresh_token);
            isAuthenticated = isRefreshed;
        }
    }

    if (!isAuthenticated) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_id");

        if (path !== "/auth") {
            window.history.replaceState({}, "", "/auth");
            path = "/auth";
        }
    } else {
        if (path !== "/app") {
            window.history.replaceState({}, "", "/app");
            path = "/app";
        }
        renderNavBarProfile();
        renderSidebarTags();
        renderPinnedNotesWithTags();
    }

    document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));

    if (path === "/auth") {
        document.getElementById("page-auth").classList.remove("hidden");
    } else if (path === "/app") {
        document.getElementById("page-app").classList.remove("hidden");
    }
};

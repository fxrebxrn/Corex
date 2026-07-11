import { navigateTo } from "./router.js";

export const initLanding = () => {
    const page = document.getElementById("page-landing");

    if (!page) return;

    const scrollTargets = [
        ["lp-nav-btn-features", "lp-main-features"],
        ["lp-nav-btn-editor", "lp-main-editor"],
        ["lp-nav-btn-betatest", "lp-main-start"],
    ];

    scrollTargets.forEach(([buttonId, sectionId]) => {
        const button = page.querySelector(`#${buttonId}`);
        const section = page.querySelector(`#${sectionId}`);

        if (!button || !section) return;

        button.addEventListener("click", () => {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    const startButtonIds = ["lp-start-btn", "lp-main-head-start-btn", "lp-main-start-btn"];

    startButtonIds.forEach((buttonId) => {
        const button = page.querySelector(`#${buttonId}`);

        if (!button) return;

        button.addEventListener("click", () => {
            navigateTo("/auth");
        });
    });
};

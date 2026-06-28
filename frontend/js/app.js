import { renderRoute } from "./router.js";
import { initOptionsMenu } from "./ui.js";

import './auth.js';
import './notes.js';
import './tags.js';


const initApp = () => {
    renderRoute();
    initOptionsMenu();
};

window.addEventListener("popstate", renderRoute);

document.addEventListener("DOMContentLoaded", initApp);

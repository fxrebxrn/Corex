import { renderRoute } from "./router.js";
import { initOptionsMenu } from "./ui.js";
import { initEditor } from "./editor.js";

import './auth.js';
import './notes.js';
import './tags.js';


const initApp = () => {
    initEditor();
    renderRoute();
    initOptionsMenu();
};

window.addEventListener("popstate", renderRoute);
document.addEventListener("DOMContentLoaded", initApp);

import { renderRoute } from "./router.js";

import './auth.js';
import './notes.js';


const initApp = () => {
    renderRoute();
};

window.addEventListener("popstate", renderRoute);

document.addEventListener("DOMContentLoaded", initApp);

import { tokenCheckRequest } from "./api.js";
import { renderNavBarProfile } from "./notes.js";
import { renderRoute } from "./router.js";
import { refreshToken } from "./auth.js";

import './auth.js';
import './notes.js';


const initApp = () => {
    renderRoute();
};

window.addEventListener("popstate", renderRoute);

document.addEventListener("DOMContentLoaded", initApp);

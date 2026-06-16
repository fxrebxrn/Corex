const initApp = async () => {
    const savedToken = localStorage.getItem("access_token");
    const currentPage = window.location.pathname.split("/").pop();

    if (savedToken) {
        if (currentPage !== "notes.html") {
            window.location.href = "notes.html";
        }
    } else {
        if (currentPage !== "auth.html") {
            window.location.href = "auth.html";
        }
    }
};

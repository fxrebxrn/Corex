const logoutBtn = document.querySelector("#logout-button");

logoutBtn.addEventListener("click", () => {
    removeTokens();
    window.location.href = "auth.html";
});

const logoutBtn = document.querySelector("#logout-button");

logoutBtn.addEventListener("click", () => {
    removeTokens();
    navigateTo("/auth");
});

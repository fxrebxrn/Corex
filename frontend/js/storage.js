const saveTokens = (access_token, refresh_token) => {
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
};

const removeTokens = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
};
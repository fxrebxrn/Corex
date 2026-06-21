import { refreshTokenRequest } from "./api.js";


export const saveTokens = (access_token, refresh_token) => {
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
};

export const removeTokens = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
};

export const refreshToken = async (refresh_token) => {
    const data = await refreshTokenRequest(refresh_token);

    if (!data.success) {
        return false;
    }

    saveTokens(data.access_token, data.refresh_token);
    return true;
};

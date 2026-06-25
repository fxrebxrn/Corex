import { showToast } from "./ui.js";

const API_URL = "http://127.0.0.1:8000/api";


export const checkUsernameRequest = async (username) => {
    try {
        const response = await fetch(`${API_URL}/users/check/${username}`);

        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: error.message
        };
    }
};

export const loginRequest = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail || "Login failed"
            };
        }

        return {
            success: true,
            ...data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const registerRequest = async (name, username, email, password) => {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail || "Register failed"
            };
        }

        return {
            success: true,
            ...data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const tokenCheckRequest = async (token) => {
    try {
        const response = await fetch(`${API_URL}/auth/check`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail
            };
        };

        return {
            success: true,
            ...data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const refreshTokenRequest = async (refresh_token) => {
    try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                refresh_token: refresh_token
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail
            };
        };

        return {
            success: true,
            ...data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const getUserMeRequest = async (token) => {
    try {
        const response = await fetch(`${API_URL}/users/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail
            };
        };

        return {
            success: true,
            ...data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const editUserProfileRequest = async (name, username, token) => {
    try {
        const response = await fetch(`${API_URL}/users/me`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name: name,
                username: username
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail
            };
        };

        return {
            success: true,
            ...data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const logoutRequest = async (access_token, refresh_token) => {
    try {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            },
            body: JSON.stringify({
                refresh_token: refresh_token
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail
            };
        };

        return {
            success: true,
            ...data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const getUserTagsRequest = async (token) => {
    try {
        const response = await fetch(`${API_URL}/tags/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail
            };
        };

        return {
            success: true,
            tags: data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const deleteTagRequest = async (tag_id, token) => {
    try {
        const response = await fetch(`${API_URL}/tags/${tag_id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 204 || response.status === 200) {
            return { success: true };
        }

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail
            };
        }

        return {
            success: true,
            ...data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const createTagRequest = async (token, tagName) => {
    try {
        const response = await fetch(`${API_URL}/tags`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name: tagName
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                detail: data.detail
            };
        };

        return {
            success: true,
            ...data
        };

    } catch (error) {
        showToast(error.message);

        return {
            success: false,
            detail: "Network error"
        };
    }
};

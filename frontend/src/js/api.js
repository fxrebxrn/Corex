import { showToast } from "./ui.js";

const resolveApiUrl = () => {
    const configured = import.meta.env.VITE_API_URL?.trim();

    if (configured) {
        return configured.replace(/\/$/, "");
    }

    return `http://${window.location.hostname}:8000/api`;
};

export const API_URL = resolveApiUrl();

const clearSessionAndRedirect = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");

    if (window.location.pathname !== "/auth") {
        window.history.replaceState({}, "", "/auth");
        window.dispatchEvent(new PopStateEvent("popstate"));
    }
};

let refreshAccessPromise = null;

const readJsonSafely = async (response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
        clearSessionAndRedirect();
        return null;
    }

    if (!refreshAccessPromise) {
        refreshAccessPromise = refreshTokenRequest(refreshToken)
            .then((data) => {
                if (data?.success && data.access_token && data.refresh_token) {
                    localStorage.setItem("access_token", data.access_token);
                    localStorage.setItem("refresh_token", data.refresh_token);
                    return data.access_token;
                }

                clearSessionAndRedirect();
                return null;
            })
            .catch(() => {
                clearSessionAndRedirect();
                return null;
            })
            .finally(() => {
                refreshAccessPromise = null;
            });
    }

    return refreshAccessPromise;
};

const requestWithAuth = async (url, options = {}, shouldRetry = true) => {
    const headers = new Headers(options.headers || {});
    const accessToken = localStorage.getItem("access_token");

    if (accessToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && shouldRetry) {
        const refreshedToken = await refreshAccessToken();

        if (refreshedToken) {
            const retriedHeaders = new Headers(options.headers || {});
            retriedHeaders.set("Authorization", `Bearer ${refreshedToken}`);
            return requestWithAuth(url, { ...options, headers: retriedHeaders }, false);
        }
    }

    return response;
};

export const checkUsernameRequest = async (username) => {
    try {
        const response = await fetch(`${API_URL}/users/check/${username}`);

        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        return {
            success: false,
            detail: error.message || "Network error"
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
    } catch {
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
                name,
                email,
                username,
                password
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
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const tokenCheckRequest = async (token) => {
    try {
        const response = await requestWithAuth(`${API_URL}/auth/check`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Session expired"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
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
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                refresh_token
            })
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Refresh failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const getUserMeRequest = async (token) => {
    try {
        const response = await requestWithAuth(`${API_URL}/users/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const editUserProfileRequest = async (name, username, token) => {
    try {
        const response = await requestWithAuth(`${API_URL}/users/me`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                username
            })
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const logoutRequest = async (access_token, refresh_token) => {
    try {
        const response = await requestWithAuth(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            },
            body: JSON.stringify({
                refresh_token
            })
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Logout failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const getUserTagsRequest = async (token) => {
    try {
        const response = await requestWithAuth(`${API_URL}/tags/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            tags: data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const deleteTagRequest = async (tag_id, token) => {
    try {
        const response = await requestWithAuth(`${API_URL}/tags/${tag_id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 204 || response.status === 200) {
            return { success: true };
        }

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const createTagRequest = async (token, tagName) => {
    try {
        const response = await requestWithAuth(`${API_URL}/tags`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name: tagName
            })
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const getUserPinnedNotesRequest = async (token) => {
    try {
        const response = await requestWithAuth(`${API_URL}/notes/me/pinned`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            notes: data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const archiveNoteRequest = async (token, note_id) => {
    try {
        const response = await requestWithAuth(`${API_URL}/notes/${note_id}/archive`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const pinNoteRequest = async (token, note_id) => {
    try {
        const response = await requestWithAuth(`${API_URL}/notes/${note_id}/pin`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const deleteNoteRequest = async (token, note_id) => {
    try {
        const response = await requestWithAuth(`${API_URL}/notes/me/${note_id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const syncNoteTagsRequest = async (token, note_id, tag_ids) => {
    try {
        const response = await requestWithAuth(`${API_URL}/notes/me/${note_id}/tags`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ tag_ids })
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Failed to sync tags"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const getRegularNotesRequest = async (token, limit = 50, cursor = null) => {
    try {
        const url = new URL(`${API_URL}/notes/me`);
        url.searchParams.append("limit", limit);
        if (cursor) {
            if (cursor.updated_at) {
                url.searchParams.append("cursor_updated_at", cursor.updated_at);
            }
            if (cursor.id) {
                url.searchParams.append("cursor_id", cursor.id);
            }
        }

        const response = await requestWithAuth(url.toString(), {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Failed to fetch notes"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const createNoteRequest = async (token) => {
    try {
        const response = await requestWithAuth(`${API_URL}/notes`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Request failed"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const searchNotesRequest = async (token, searchQuery, limit = 50, cursor = null) => {
    try {
        const url = new URL(`${API_URL}/notes/me/search`);
        url.searchParams.append("query", searchQuery);
        url.searchParams.append("limit", limit);

        if (cursor) {
            if (cursor.updated_at) {
                url.searchParams.append("cursor_updated_at", cursor.updated_at);
            }
            if (cursor.id) {
                url.searchParams.append("cursor_id", cursor.id);
            }
        }

        const response = await requestWithAuth(url.toString(), {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Failed to search notes"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const getNoteRequest = async (token, noteId) => {
    try {
        const response = await requestWithAuth(`${API_URL}/notes/me/${noteId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Failed to fetch note"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const finalizeNoteRequest = async (token, noteId, title, content) => {
    try {
        const response = await requestWithAuth(`${API_URL}/notes/${noteId}/finalize`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title, content })
        });

        if (response.status === 204) {
            return {
                success: true,
                deleted: true
            };
        }

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Failed to save note"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const getArchivedNotesRequest = async (token, limit = 50, cursor = null) => {
    try {
        const url = new URL(`${API_URL}/notes/me/archived`);
        url.searchParams.append("limit", limit);
        if (cursor) {
            if (cursor.updated_at) {
                url.searchParams.append("cursor_updated_at", cursor.updated_at);
            }
            if (cursor.id) {
                url.searchParams.append("cursor_id", cursor.id);
            }
        }

        const response = await requestWithAuth(url.toString(), {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Failed to fetch archived notes"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
        return {
            success: false,
            detail: "Network error"
        };
    }
};

export const getTagNotesRequest = async (token, tagId, limit = 50, cursor = null) => {
    try {
        const url = new URL(`${API_URL}/notes/me/tag/${tagId}`);
        url.searchParams.append("limit", limit);
        if (cursor) {
            if (cursor.updated_at) {
                url.searchParams.append("cursor_updated_at", cursor.updated_at);
            }
            if (cursor.id) {
                url.searchParams.append("cursor_id", cursor.id);
            }
        }

        const response = await requestWithAuth(url.toString(), {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readJsonSafely(response);

        if (!response.ok) {
            return {
                success: false,
                detail: data?.detail || "Failed to fetch tag notes"
            };
        }

        return {
            success: true,
            ...data
        };
    } catch {
    }
};

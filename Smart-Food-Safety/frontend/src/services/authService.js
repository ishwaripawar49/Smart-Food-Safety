
const API_URL = (import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:5000/api";

// LOGIN
export const login = async (email, password) => {
  let response;
  let data;

  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });

    data = await response.json();
  } catch (error) {
    throw new Error(
      "Cannot connect to the backend. Please check whether the server is running on port 5000.",
      { cause: error }
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Login failed.");
  }

  if (!data.token || !data.user) {
    throw new Error("Invalid login response from server.");
  }

  // Save the new login session
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
};

// GET TOKEN
export const getToken = () => {
  return localStorage.getItem("token");
};

// GET USER
export const getUser = () => {
  const user = localStorage.getItem("user");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

// CHECK LOGIN
export const isLoggedIn = () => {
  return Boolean(getToken() && getUser());
};

// LOGOUT
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// CLEAR SESSION
export const clearSession = () => {
  logout();
};

// GET CURRENT USER
export const getCurrentUser = async () => {
  const token = getToken();

  if (!token) {
    throw new Error("Please login again.");
  }

  let response;
  let data;

  try {
    response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    data = await response.json();
  } catch {
    throw new Error(
      "Cannot connect to the backend. Please check the server."
    );
  }

  if (response.status === 401) {
    logout();
    throw new Error("Your session has expired. Please login again.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Unable to verify session.");
  }

  if (!data.success || !data.user) {
    throw new Error("Invalid session information.");
  }

  localStorage.setItem("user", JSON.stringify(data.user));

  return data.user;
};

// VERIFY SESSION
export const verifySession = async () => {
  try {
    const user = await getCurrentUser();
    return Boolean(user);
  } catch {
    logout();
    return false;
  }
};

// AUTHENTICATED FETCH
export const authFetch = async (url, options = {}) => {
  const token = getToken();

  if (!token) {
    throw new Error("Please login again.");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  // Do not set Content-Type for FormData.
  // The browser must set its multipart boundary automatically.
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Please check the server."
    );
  }

  if (response.status === 401) {
    logout();
    throw new Error("Your session has expired. Please login again.");
  }

  return response;
};

// GET API URL
export const getApiUrl = () => {
  return API_URL;
};
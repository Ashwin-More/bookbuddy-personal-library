// auth.js - Simple client-side authentication (localStorage based)
// NOTE: This runs entirely in the browser. Passwords are hashed with SHA-256
// before storage, but since there is no server, this is meant for a personal/
// single-machine app, not a security-critical, multi-machine login system.

const AUTH_USERS_KEY = "bookshelf_users";
const AUTH_SESSION_KEY = "bookshelf_currentUser";

// Hash a password with SHA-256 (Web Crypto API)
async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getUsers() {
  return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const id = localStorage.getItem(AUTH_SESSION_KEY);
  if (!id) return null;
  return getUsers().find((u) => u.id === id) || null;
}

function setCurrentUser(id) {
  localStorage.setItem(AUTH_SESSION_KEY, id);
}

function logout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  window.location.href = "login.html";
}

async function registerUser(username, password) {
  username = (username || "").trim();
  if (!username || !password) {
    throw new Error("Username and password are required.");
  }
  if (password.length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }
  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("That username is already taken.");
  }
  const passwordHash = await hashPassword(password);
  const user = {
    id: "user-" + Date.now(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user.id);
  return user;
}

async function loginUser(username, password) {
  const users = getUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === (username || "").trim().toLowerCase(),
  );
  if (!user) {
    throw new Error("Invalid username or password.");
  }
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error("Invalid username or password.");
  }
  setCurrentUser(user.id);
  return user;
}

// Redirects to login.html if no one is logged in. Returns the current user otherwise.
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

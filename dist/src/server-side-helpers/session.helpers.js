"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getSessionData = getSessionData;
exports.rotateSession = rotateSession;
exports.getSessionId = getSessionId;
exports.deleteSession = deleteSession;
const redis_1 = __importDefault(require("../lib/redis"));
const cache_helpers_1 = require("./cache.helpers");
const crypto_1 = __importDefault(require("crypto"));
// Session constants
const SESSION_ROTATION_TIME = parseInt(process.env.SESSION_ROTATION_TIME_MIN || '2') * 60;
const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY_MIN || '1440') * 60;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session_id';
/**
 * Create a randomized cookie string.
 */
function createSessionCookieString() {
    return crypto_1.default.randomBytes(40).toString('hex');
}
/**
 * Create a new session for a user
 * @param user The user object to store in the session
 * @param response Optional NextResponse to set the cookie on
 * @returns The session ID
 */
async function createSession(user, response) {
    const sessionId = createSessionCookieString();
    // Store user data in Redis with the session ID as the key
    await redis_1.default.set((0, cache_helpers_1.getRedisKey)(`session:${sessionId}`), JSON.stringify({
        userId: user.id.toString(),
        email: user.email,
        createdAt: Date.now()
    }), 'EX', SESSION_EXPIRY);
    // Set the session cookie if a response object is provided
    if (response) {
        response.cookies.set({
            name: process.env.SESSION_COOKIE_NAME,
            value: sessionId,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: SESSION_EXPIRY,
            path: '/'
        });
    }
    return sessionId;
}
/**
 * Get the current session data from Redis
 * @param sessionId The session ID
 * @returns The session data or null if not found
 */
async function getSessionData(sessionId) {
    const data = await redis_1.default.get((0, cache_helpers_1.getRedisKey)(`session:${sessionId}`));
    if (!data) {
        return null;
    }
    return JSON.parse(data);
}
/**
 * Rotate the session ID to prevent session hijacking
 * @param currentSessionId
 * @param cookieStore
 * @returns The new session ID
 */
async function rotateSession(currentSessionId, cookieStore) {
    const sessionData = await getSessionData(currentSessionId);
    if (!sessionData) {
        return null;
    }
    // Check if rotation is needed
    const sessionAge = (Date.now() - sessionData.createdAt) / 1000;
    if (sessionAge < SESSION_ROTATION_TIME) {
        return currentSessionId;
    }
    const newSessionId = createSessionCookieString();
    // Store updated session data with new ID
    await redis_1.default.set((0, cache_helpers_1.getRedisKey)(`session:${newSessionId}`), JSON.stringify(Object.assign(Object.assign({}, sessionData), { createdAt: Date.now() })), 'EX', SESSION_EXPIRY);
    setTimeout(async () => {
        await redis_1.default.del((0, cache_helpers_1.getRedisKey)(`session:${currentSessionId}`));
    }, 5000);
    return newSessionId;
}
/**
 * Get the session ID from cookies or request
 * @param cookieStore
 * @returns The session ID or undefined if not found
 */
async function getSessionId(cookieStore) {
    var _a, _b;
    return (_b = (_a = cookieStore.get) === null || _a === void 0 ? void 0 : _a.call(cookieStore, SESSION_COOKIE_NAME)) === null || _b === void 0 ? void 0 : _b.value;
}
/**
 * Delete a session (logout)
 * @param sessionId The session ID to delete
 */
async function deleteSession(sessionId) {
    await redis_1.default.del((0, cache_helpers_1.getRedisKey)(`session:${sessionId}`));
}
//# sourceMappingURL=session.helpers.js.map
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
    createAccessToken,
    verifyAccessToken,
    createRefreshToken,
    createActionToken,
    hashRefreshToken
} = require("../services/authService");

test("access tokens are signed for a user and expire after 15 minutes", () => {
    process.env.JWT_ACCESS_SECRET = "test-only-secret-with-at-least-32-bytes";
    const userId = new mongoose.Types.ObjectId();
    const token = createAccessToken({ _id: userId, role: "student" });
    const payload = verifyAccessToken(token);

    assert.equal(payload.sub, String(userId));
    assert.equal(payload.role, "student");
    assert.equal(payload.iss, "hackhub-api");
    assert.equal(payload.aud, "hackhub-client");
    assert.ok(payload.exp - payload.iat <= 15 * 60);
    assert.throws(() => verifyAccessToken(`${token}tampered`));
});

test("refresh tokens are random and only their hashes are stored", () => {
    const first = createRefreshToken();
    const second = createRefreshToken();

    assert.notEqual(first.token, second.token);
    assert.equal(first.hash, hashRefreshToken(first.token));
    assert.notEqual(first.hash, first.token);
    assert.equal(first.expiresAt.getTime() - Date.now() > 29 * 24 * 60 * 60 * 1000, true);
});

test("one-time action tokens are random and hashed before persistence", () => {
    const first = createActionToken();
    const second = createActionToken();

    assert.notEqual(first.token, second.token);
    assert.notEqual(first.hash, first.token);
    assert.equal(first.hash, hashRefreshToken(first.token));
});

test("access-token secret must be configured with sufficient entropy", () => {
    const previousSecret = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = "too-short";

    assert.throws(
        () => createAccessToken({ _id: new mongoose.Types.ObjectId(), role: "student" }),
        /at least 32 bytes/
    );

    if (previousSecret === undefined) {
        delete process.env.JWT_ACCESS_SECRET;
    } else {
        process.env.JWT_ACCESS_SECRET = previousSecret;
    }
});

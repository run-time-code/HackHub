const test = require("node:test");
const assert = require("node:assert/strict");
const {
    getEmailConfiguration,
    getActionUrl
} = require("../services/emailService");

test("email service reports missing SMTP configuration", () => {
    const previous = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        from: process.env.SMTP_FROM
    };

    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_FROM;
    assert.throws(() => getEmailConfiguration(), /set SMTP_HOST, SMTP_PORT, and SMTP_FROM/);

    if (previous.host === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = previous.host;
    if (previous.port === undefined) delete process.env.SMTP_PORT;
    else process.env.SMTP_PORT = previous.port;
    if (previous.from === undefined) delete process.env.SMTP_FROM;
    else process.env.SMTP_FROM = previous.from;
});

test("action links encode tokens and require HTTPS outside localhost", () => {
    const previous = process.env.FRONTEND_BASE_URL;
    process.env.FRONTEND_BASE_URL = "https://hackhub.example";
    const url = new URL(getActionUrl("/verify-email", "a+b/c"));

    assert.equal(url.origin, "https://hackhub.example");
    assert.equal(url.pathname, "/verify-email");
    assert.equal(url.searchParams.get("token"), "a+b/c");

    process.env.FRONTEND_BASE_URL = "http://hackhub.example";
    assert.throws(() => getActionUrl("/verify-email", "token"), /must use HTTPS/);

    if (previous === undefined) delete process.env.FRONTEND_BASE_URL;
    else process.env.FRONTEND_BASE_URL = previous;
});

const nodemailer = require("nodemailer");

let transport;
let transportKey;

const getEmailConfiguration = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const from = process.env.SMTP_FROM;

    if (
        !host ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535 ||
        !from
    ) {
        throw new Error(
            "Email is not configured: set SMTP_HOST, SMTP_PORT, and SMTP_FROM"
        );
    }

    const secure = process.env.SMTP_SECURE === "true";
    if (
        process.env.SMTP_SECURE !== undefined &&
        !["true", "false"].includes(process.env.SMTP_SECURE)
    ) {
        throw new Error("SMTP_SECURE must be either true or false");
    }
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if ((user && !pass) || (!user && pass)) {
        throw new Error("SMTP_USER and SMTP_PASS must either both be set or both be empty");
    }

    return { host, port, secure, user, pass, from };
};

const getTransport = (config) => {
    const key = JSON.stringify({
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user
    });

    if (!transport || transportKey !== key) {
        transport = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            ...(config.user
                ? { auth: { user: config.user, pass: config.pass } }
                : {})
        });
        transportKey = key;
    }

    return transport;
};

const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const getActionUrl = (path, token) => {
    const baseUrl = process.env.FRONTEND_BASE_URL;
    if (!baseUrl) {
        throw new Error("Email is not configured: set FRONTEND_BASE_URL");
    }

    let parsedBaseUrl;
    try {
        parsedBaseUrl = new URL(baseUrl);
    } catch {
        throw new Error("FRONTEND_BASE_URL must be a valid HTTP or HTTPS URL");
    }

    if (
        !["http:", "https:"].includes(parsedBaseUrl.protocol) ||
        (parsedBaseUrl.protocol === "http:" &&
            !["localhost", "127.0.0.1", "[::1]"].includes(parsedBaseUrl.hostname))
    ) {
        throw new Error("FRONTEND_BASE_URL must use HTTPS outside localhost");
    }

    const url = new URL(path, parsedBaseUrl);
    url.searchParams.set("token", token);
    return url.toString();
};

const sendEmail = async ({ to, subject, text, html }) => {
    const config = getEmailConfiguration();
    await getTransport(config).sendMail({
        from: config.from,
        to,
        subject,
        text,
        html
    });
};

const sendVerificationEmail = async ({ to, name, token }) => {
    const url = getActionUrl("/verify-email", token);
    const safeName = escapeHtml(name);

    await sendEmail({
        to,
        subject: "Verify your HackHub email",
        text: `Hello ${name}, verify your HackHub email by visiting: ${url}`,
        html: `<p>Hello ${safeName},</p><p><a href="${escapeHtml(url)}">Verify your HackHub email</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>`
    });
};

const sendPasswordResetEmail = async ({ to, name, token }) => {
    const url = getActionUrl("/reset-password", token);
    const safeName = escapeHtml(name);

    await sendEmail({
        to,
        subject: "Reset your HackHub password",
        text: `Hello ${name}, reset your HackHub password by visiting: ${url}`,
        html: `<p>Hello ${safeName},</p><p><a href="${escapeHtml(url)}">Reset your HackHub password</a></p><p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>`
    });
};

const sendReminderEmail = async ({ to, title, message }) => {
    const safeTitle = escapeHtml(title);
    const safeMessage = escapeHtml(message);

    await sendEmail({
        to,
        subject: "HackHub hackathon reminder",
        text: message,
        html: `<h2>${safeTitle}</h2><p>${safeMessage}</p>`
    });
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendReminderEmail,
    getEmailConfiguration,
    getActionUrl
};


"use strict";

const nodemailer = require("nodemailer");

let transporter = null;

const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("EMAIL_USER or EMAIL_PASS is not configured");
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS.replace(/\s/g, "")
            }
        });
    }

    return transporter;
};

const apiBaseUrl = () =>
    (process.env.API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const escapeAttribute = escapeHtml;

const getFrontendUrl = () => {
    const configuredUrl = process.env.FRONTEND_URL;

    if (!configuredUrl) return null;

    try {
        const url = new URL(configuredUrl);

        if (
            url.protocol !== "https:" &&
            url.hostname !== "localhost" &&
            url.hostname !== "127.0.0.1"
        ) {
            return null;
        }

        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return null;
        }

        return url.toString().replace(/\/+$/, "");
    } catch {
        return null;
    }
};

// Shared email HTML layout
const createEmailHtml = ({
    title,
    preheader,
    content,
    actionLabel,
    actionUrl,
    footerText
}) => {
    const safeTitle = escapeHtml(title);
    const safePreheader = escapeHtml(preheader);

    const action = actionLabel && actionUrl
        ? `
            <tr>
                <td align="center" style="padding: 24px 0;">
                    <a href="${escapeAttribute(actionUrl)}"
                       style="display:inline-block;padding:14px 28px;background-color:#0F8377;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:6px;font-size:15px;">
                        ${escapeHtml(actionLabel)}
                    </a>
                </td>
            </tr>
            <tr>
                <td style="padding:0 0 20px;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${escapeAttribute(actionUrl)}" style="color:#0F8377;">
                        ${escapeHtml(actionUrl)}
                    </a>
                </td>
            </tr>
        `
        : "";

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light">
            <title>${safeTitle}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
                ${safePreheader}
            </div>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:28px 12px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;">
                            <tr>
                                <td style="background-color:#0F8377;padding:24px 28px;color:#ffffff;">
                                    <div style="font-size:24px;font-weight:bold;letter-spacing:0.3px;">HackHub</div>
                                    <div style="font-size:13px;margin-top:5px;color:#e0f2f1;">Build. Collaborate. Innovate.</div>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding:30px 28px 12px;">
                                    <h1 style="margin:0 0 18px;font-size:23px;line-height:1.4;color:#0f172a;">
                                        ${safeTitle}
                                    </h1>
                                    ${content}
                                </td>
                            </tr>

                            ${action}

                            <tr>
                                <td style="padding:18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
                                    ${escapeHtml(footerText || "This is an automated message from HackHub. Please do not reply to this email.")}
                                </td>
                            </tr>
                        </table>

                        <p style="max-width:560px;margin:16px auto 0;color:#94a3b8;font-size:11px;line-height:1.5;text-align:center;">
                            &copy; HackHub. All rights reserved.
                        </p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

const sendEmail = async ({ to, subject, html, text }) => {
    const result = await getTransporter().sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        html,
        text
    });

    if (!result.accepted || result.accepted.length === 0) {
        throw new Error("Email was not accepted by the SMTP server");
    }

    return result;
};

const sendVerificationEmail = async (email, verificationToken) => {
    const verificationUrl = new URL(
        "/api/auth/verify-email",
        `${apiBaseUrl()}/`
    );

    verificationUrl.searchParams.set("token", verificationToken);

    const verificationLink = verificationUrl.toString();

    const html = createEmailHtml({
        title: "Verify your HackHub email",
        preheader: "Confirm your email address to finish setting up your account.",
        content: `
            <p style="font-size:15px;line-height:1.8;color:#475569;">
                Welcome to HackHub! Please verify your email address to complete your account setup.
            </p>
            <p style="font-size:14px;line-height:1.8;color:#475569;">
                This verification link expires in 15 minutes.
            </p>
            <p style="font-size:14px;line-height:1.8;color:#475569;">
                If you didn't create a HackHub account, you can safely ignore this email.
            </p>
        `,
        actionLabel: "Verify Email",
        actionUrl: verificationLink
    });

    const text = [
        "Welcome to HackHub!",
        "",
        "Verify your email using this link:",
        verificationLink,
        "",
        "This link expires in 15 minutes.",
        "If you didn't create a HackHub account, ignore this email."
    ].join("\n");

    return sendEmail({
        to: email,
        subject: "Verify your HackHub email",
        html,
        text
    });
};

const sendTeamEmail = async (email, subject, message) => {
    const frontendUrl = getFrontendUrl();

    const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");

    const html = createEmailHtml({
        title: subject,
        preheader: message,
        content: `
            <p style="font-size:15px;line-height:1.8;color:#475569;">
                ${safeMessage}
            </p>
        `,
        actionLabel: frontendUrl ? "Open HackHub" : undefined,
        actionUrl: frontendUrl || undefined
    });

    const text = [
        subject,
        "",
        message,
        ...(frontendUrl ? ["", `Open HackHub: ${frontendUrl}`] : [])
    ].join("\n");

    return sendEmail({
        to: email,
        subject,
        html,
        text
    });
};

const sendPasswordResetEmail = async (email, resetToken) => {
    const html = createEmailHtml({
        title: "Password reset request",
        preheader: "Instructions for your HackHub password reset.",
        content: `
            <p style="font-size:15px;line-height:1.8;color:#475569;">
                We received a request to reset your HackHub password.
            </p>
            <p style="font-size:14px;line-height:1.8;color:#475569;">
                Your password reset token is shown below. It expires in 15 minutes.
            </p>
            <div style="padding:14px;background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-family:monospace;font-size:13px;line-height:1.7;overflow-wrap:anywhere;">
                ${escapeHtml(resetToken)}
            </div>
            <p style="font-size:13px;line-height:1.8;color:#64748b;">
                The password reset API currently requires a POST request containing this token and your new password. Do not share this token with anyone.
            </p>
            <p style="font-size:14px;line-height:1.8;color:#475569;">
                If you didn't request a password reset, you can ignore this email.
            </p>
        `
    });

    const text = [
        "We received a request to reset your HackHub password.",
        "",
        "Password reset token:",
        resetToken,
        "",
        "This token expires in 15 minutes.",
        "The current reset API requires a POST request with the token and your new password.",
        "Do not share this token with anyone.",
        "",
        "If you didn't request a password reset, ignore this email."
    ].join("\n");

    return sendEmail({
        to: email,
        subject: "Reset your HackHub password",
        html,
        text
    });
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendTeamEmail
};

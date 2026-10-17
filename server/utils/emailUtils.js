const { Resend } = require("resend");

// Construct the client lazily so environments without RESEND_API_KEY
// (local dev, CI) can boot the server; sending then fails with a clear
// error at call time instead of crashing the process at require time.
let resendClient = null;

const getClient = () => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error(
            "RESEND_API_KEY is not configured; cannot send email"
        );
    }

    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }

    return resendClient;
};

// Public base URL of this API (links inside outgoing emails).
const apiBaseUrl = () =>
    process.env.API_BASE_URL || "http://localhost:5000";

const sendVerificationEmail = async (email, verificationToken) => {
    const verificationLink =
        `${apiBaseUrl()}/api/auth/verify-email?token=${verificationToken}`;

    await getClient().emails.send({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Verify your HackHub email",
        html: `
            <h2>Welcome to HackHub!</h2>

            <p>Please verify your email address by clicking the link below:</p>

            <p>
                <a href="${verificationLink}">
                    Verify Email
                </a>
            </p>

            <p>This link will expire in 15 minutes.</p>

            <p>If you did not create a HackHub account, you can ignore this email.</p>
        `
    });
};


const sendPasswordResetEmail = async (email, resetToken) => {
    const resetLink =
        `${apiBaseUrl()}/api/auth/reset-password?token=${resetToken}`;

    await getClient().emails.send({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Reset your HackHub password",
        html: `
            <h2>Password Reset Request</h2>

            <p>We received a request to reset your HackHub password.</p>

            <p>
                <a href="${resetLink}">
                    Reset Password
                </a>
            </p>

            <p>This link will expire in 15 minutes.</p>

            <p>If you did not request a password reset, you can ignore this email.</p>
        `
    });
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
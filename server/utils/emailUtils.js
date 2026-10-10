const { Resend } = require("resend");

function getResend() {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is required to send email");
    }
    return new Resend(process.env.RESEND_API_KEY);
}

function getFrontendUrl() {
    const configuredUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:5173";
    return configuredUrl.split(",")[0].replace(/\/$/, "");
}

const sendVerificationEmail = async (email, verificationToken) => {
    const verificationLink =
        `${getFrontendUrl()}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    await getResend().emails.send({
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
        `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await getResend().emails.send({
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
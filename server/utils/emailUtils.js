const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, verificationToken) => {
    const verificationLink =
        `http://localhost:5000/api/auth/verify-email?token=${verificationToken}`;

    await resend.emails.send({
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
        `http://localhost:5000/api/auth/reset-password?token=${resetToken}`;

    await resend.emails.send({
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
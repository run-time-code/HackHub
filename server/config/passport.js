const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            scope: ["profile", "email"]
        },
        (accessToken, refreshToken, profile, done) => {
            const emailVerified =
                profile._json?.email_verified === true;

            profile.emails = (profile.emails || []).map(email => ({
                ...email,
                verified: emailVerified
            }));

            done(null, profile);
        }
    )
);

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL,
            scope: ["user:email"]
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const response = await fetch(
                    "https://api.github.com/user/emails",
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: "application/vnd.github+json",
                            "X-GitHub-Api-Version": "2022-11-28"
                        }
                    }
                );

                if (!response.ok) {
                    return done(
                        new Error("Unable to verify GitHub email")
                    );
                }

                const emails = await response.json();

                const verifiedEmail = emails.find(
                    email => email.primary && email.verified
                );

                if (!verifiedEmail) {
                    return done(null, false);
                }

                profile.emails = [
                    {
                        value: verifiedEmail.email,
                        verified: true
                    }
                ];

                done(null, profile);
            } catch (error) {
                done(error);
            }
        }
    )
);

module.exports = passport;
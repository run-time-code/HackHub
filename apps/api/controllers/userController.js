const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const skillTaxonomy = require("../utils/skillTaxonomy");
const { updateProfileSchema, updateSkillsSchema} = require("../validators/userValidator");
const cloudinary = require("../config/cloudinary");
const {
    accessCookieOptions,
    refreshCookieOptions
} = require("../utils/cookieUtils");
const Registration = require("../models/Registration");
const Hackathon = require("../models/Hackathon");

const DEFAULT_LINKS = Object.freeze({
    github: "",
    linkedin: "",
    portfolio: ""
});

function plainObject(value) {
    if (!value) {
        return {};
    }

    if (typeof value.toObject === "function") {
        return value.toObject();
    }

    return value;
}

function serializeLinks(links) {
    const source = plainObject(links) || {};

    return {
        github: typeof source.github === "string" ? source.github : "",
        linkedin: typeof source.linkedin === "string" ? source.linkedin : "",
        portfolio: typeof source.portfolio === "string" ? source.portfolio : ""
    };
}

function serializePastHackathons(pastHackathons) {
    if (!Array.isArray(pastHackathons)) {
        return [];
    }

    return pastHackathons.map((entry) => {
        const source = plainObject(entry) || {};

        return {
            name: typeof source.name === "string" ? source.name : "",
            year: typeof source.year === "string" ? source.year : "",
            projectUrl: typeof source.projectUrl === "string" ? source.projectUrl : ""
        };
    });
}

function serializeSkillProficiency(skillProficiency) {
    const source = plainObject(skillProficiency);

    if (!source || typeof source !== "object" || Array.isArray(source)) {
        return {};
    }

    return { ...source };
}

function pruneSkillProficiency(user, skills) {
    const allowed = new Set(Array.isArray(skills) ? skills : []);
    const current = serializeSkillProficiency(user.skillProficiency);
    const pruned = Object.fromEntries(
        Object.entries(current).filter(([skill]) => allowed.has(skill))
    );

    user.skillProficiency = pruned;
    user.markModified("skillProficiency");
}

function serializeOwnProfile(user) {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio || "",
        college: user.college || "",
        location: user.location || "",
        headline: user.headline || "",
        year: user.year || "",
        links: serializeLinks(user.links),
        pastHackathons: serializePastHackathons(user.pastHackathons),
        skills: user.skills || [],
        skillProficiency: serializeSkillProficiency(user.skillProficiency),
        preferences: user.preferences || {},
        avatarUrl: user.avatarUrl || "",
        availability: user.availability,
        lookingForTeam: Boolean(user.lookingForTeam),
        discoverable: Boolean(user.discoverable),
        emailVerified: Boolean(user.emailVerified),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

function serializePublicProfile(user) {
    return {
        id: String(user._id),
        name: user.name,
        bio: user.bio || "",
        college: user.college || "",
        location: user.location || "",
        headline: user.headline || "",
        year: user.year || "",
        skills: user.skills || [],
        skillProficiency: serializeSkillProficiency(user.skillProficiency),
        links: serializeLinks(user.links),
        pastHackathons: serializePastHackathons(user.pastHackathons),
        avatarUrl: user.avatarUrl || "",
        availability: user.availability,
        lookingForTeam: Boolean(user.lookingForTeam),
        createdAt: user.createdAt
    };
}

const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "-password -refreshTokenHash -emailVerificationTokenHash -emailVerificationTokenExpiresAt -passwordResetTokenHash -passwordResetTokenExpiresAt"
        );

        if (!user) {
            console.log("User not found");

            return res.status(404).json({
                message: "User not found"
            });
        }

        console.log(`Profile retrieved for user: ${user.email}`);

        return res.status(200).json({
            message: "Profile retrieved successfully",
            user: serializeOwnProfile(user)
        });

    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const saveOnboarding = async (req, res) => {
    const { skills, interests, preferredMode, location } = req.body || {};
    const validModes = ["online", "offline", "hybrid"];

    if (
        !Array.isArray(skills) || skills.length === 0 || skills.length > 10 ||
        skills.some(skill => typeof skill !== "string" || !skill.trim()) ||
        !Array.isArray(interests) || interests.length === 0 || interests.length > 10 ||
        interests.some(interest => typeof interest !== "string" || !interest.trim()) ||
        !validModes.includes(preferredMode) ||
        typeof location !== "string" || location.trim().length < 2 || location.trim().length > 100
    ) {
        return res.status(400).json({ message: "Invalid onboarding data" });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user || user.deletedAt) {
            return res.status(404).json({ message: "User not found" });
        }

        user.skills = [...new Set(skills.map(skill => skill.trim()))];
        pruneSkillProficiency(user, user.skills);
        user.location = location.trim();
        user.preferences = {
            ...(user.preferences || {}),
            interests: [...new Set(interests.map(interest => interest.trim()))],
            preferredMode
        };
        await user.save();

        return res.status(200).json({ message: "Onboarding saved successfully" });
    } catch (error) {
        console.error("Save onboarding error:", error);
        return res.status(500).json({ message: "Unable to save onboarding" });
    }
};


const updateMyProfile = async (req, res) => {
    try {
        const validation = updateProfileSchema.safeParse(req.body);

if (!validation.success) {
    return res.status(400).json({
        message: "Invalid profile data",
        errors: validation.error.issues
    });
}

const {
    name,
    bio,
    college,
    location,
    headline,
    year,
    links,
    pastHackathons,
    skillProficiency,
    preferences,
    availability,
    lookingForTeam,
    discoverable
} = validation.data;
        const user = await User.findById(req.user.id);

        if (!user) {
            console.log("User not found");

            return res.status(404).json({
                message: "User not found"
            });
        }

        if (name !== undefined) {
            user.name = name;
        }

        if (bio !== undefined) {
            user.bio = bio;
        }

        if (college !== undefined) {
            user.college = college;
        }

        if (location !== undefined) {
            user.location = location;
        }

        if (headline !== undefined) {
            user.headline = headline;
        }

        if (year !== undefined) {
            user.year = year;
        }

        if (links !== undefined) {
            user.links = {
                ...DEFAULT_LINKS,
                ...serializeLinks(user.links),
                ...links
            };
            user.markModified("links");
        }

        if (pastHackathons !== undefined) {
            user.pastHackathons = pastHackathons.map((entry) => ({
                name: entry.name || "",
                year: entry.year || "",
                projectUrl: entry.projectUrl || ""
            }));
        }

        if (skillProficiency !== undefined) {
            user.skillProficiency = {
                ...serializeSkillProficiency(user.skillProficiency),
                ...skillProficiency
            };
            user.markModified("skillProficiency");
        }

        if (preferences !== undefined) {
            user.preferences = preferences;
        }

        if (availability !== undefined) {
            user.availability = availability;
        }

        if (lookingForTeam !== undefined) {
            user.lookingForTeam = lookingForTeam;
        }

        if (discoverable !== undefined) {
            user.discoverable = discoverable;
        }

        await user.save();

        console.log(`Profile updated for user: ${user.email}`);

        return res.status(200).json({
            message: "Profile updated successfully",
            user: serializeOwnProfile(user)
        });

    } catch (error) {
        console.error("Update profile error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const getPublicProfile = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
        message: "Invalid user ID"
    });
}

        const user = await User.findOne({ _id: id, deletedAt: null }).select(
            "name bio college location headline year skills skillProficiency " +
            "links pastHackathons avatarUrl availability lookingForTeam createdAt"
        );

        if (!user) {
            console.log("User not found");

            return res.status(404).json({
                message: "User not found"
            });
        }

        console.log(`Public profile retrieved for user: ${user._id}`);

        return res.status(200).json({
            message: "Public profile retrieved successfully",
            user: serializePublicProfile(user)
        });

    } catch (error) {
        console.error("Get public profile error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const updateMySkills = async (req, res) => {
    try {
        const validation = updateSkillsSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Invalid skills data",
                errors: validation.error.issues
            });
        }

        const { skills } = validation.data;

        const validSkills = Object.values(skillTaxonomy).flat();

        const uniqueSkills = [...new Set(skills)];

        const invalidSkills = uniqueSkills.filter(
            skill => !validSkills.includes(skill)
        );

        if (invalidSkills.length > 0) {
            return res.status(400).json({
                message: "Invalid skill(s)",
                invalidSkills
            });
        }

        const user = await User.findById(req.user.id);
   
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        user.skills = uniqueSkills;
        pruneSkillProficiency(user, uniqueSkills);

        await user.save();

        console.log(
    `Skills updated for user: ${user.email} | Skills: ${user.skills.join(", ")}`
);

        return res.status(200).json({
            message: "Skills updated successfully",
            skills: user.skills
        });

    } catch (error) {
        console.error("Update skills error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Avatar image is required"
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        console.log(`Uploading avatar for user: ${user.email}`);

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "hackhub/avatars",
                    resource_type: "image",
                    allowed_formats: ["jpg", "jpeg", "png", "webp"]
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            stream.end(req.file.buffer);
        });

        user.avatarUrl = result.secure_url;

        await user.save();

        console.log(`Avatar updated for user: ${user.email}`);

        return res.status(200).json({
            message: "Avatar uploaded successfully",
            avatarUrl: user.avatarUrl
        });

    } catch (error) {
    console.error("Avatar upload error:", error.message);

    return res.status(500).json({
        message: "Avatar upload failed"
    });
}
};


const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required"
            });
        }

        const passwordRegex =
            /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message:
                    "New password must be at least 8 characters long and contain at least one uppercase letter and one special character"
            });
        }

        const user = await User.findById(req.user.id)
            .select("+password");

        if (!user || user.deletedAt) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (!user.password) {
            return res.status(400).json({
                message:
                    "This account uses social login and has no password to change"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Current password is incorrect"
            });
        }

        const isSamePassword = await bcrypt.compare(
            newPassword,
            user.password
        );

        if (isSamePassword) {
            return res.status(400).json({
                message: "New password must differ from the current password"
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);

        // Invalidate access tokens and refresh-token sessions.
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.refreshTokenHash = null;

        await user.save();

        // Log out the current browser too.
        res.clearCookie("accessToken", accessCookieOptions);
        res.clearCookie("refreshToken", refreshCookieOptions);

        return res.status(200).json({
            message:
                "Password changed successfully. Please log in again."
        });
    } catch (error) {
        console.error("Change password error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const revokeAllSessions = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || user.deletedAt) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Invalidate all existing access tokens.
        user.tokenVersion = (user.tokenVersion || 0) + 1;

        // Invalidate the stored refresh token.
        user.refreshTokenHash = null;

        await user.save();

        // Clear cookies in this browser.
        res.clearCookie("accessToken", accessCookieOptions);
        res.clearCookie("refreshToken", refreshCookieOptions);

        return res.status(200).json({
            message: "All sessions have been revoked. Please log in again."
        });
    } catch (error) {
        console.error("Revoke sessions error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const deleteMyAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || user.deletedAt) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Soft-delete the account.
        user.deletedAt = new Date();

        // Invalidate existing access and refresh tokens.
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.refreshTokenHash = null;

        // Remove outstanding password-reset and verification tokens.
        user.passwordResetTokenHash = null;
        user.passwordResetTokenExpiresAt = null;
        user.emailVerificationTokenHash = null;
        user.emailVerificationTokenExpiresAt = null;

        await user.save();

        // Clear authentication cookies in this browser.
        res.clearCookie("accessToken", accessCookieOptions);
        res.clearCookie("refreshToken", refreshCookieOptions);

        return res.status(200).json({
            message:
                "Account deleted successfully. Your account has been deactivated."
        });
    } catch (error) {
        console.error("Account deletion error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const exportMyData = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "-password -refreshTokenHash " +
            "-emailVerificationTokenHash " +
            "-emailVerificationTokenExpiresAt " +
            "-passwordResetTokenHash " +
            "-passwordResetTokenExpiresAt"
        );

        if (!user || user.deletedAt) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const registrations = await Registration.find({
            user: user._id
        }).lean();

        const hackathonIds = registrations.map(
            registration => registration.hackathon
        );

        const hackathons = await Hackathon.find({
            hackathon_id: { $in: hackathonIds }
        }).select(
            "hackathon_id title registration_deadline is_active"
        ).lean();

        const hackathonMap = new Map(
            hackathons.map(hackathon => [
                hackathon.hackathon_id,
                hackathon
            ])
        );

        const trackingData = registrations.map(registration => ({
            hackathon: hackathonMap.get(registration.hackathon) || {
                hackathon_id: registration.hackathon
            },
            registered: registration.registered,
            notes: registration.notes,
            createdAt: registration.createdAt,
            updatedAt: registration.updatedAt
        }));

        const exportData = {
            exportedAt: new Date().toISOString(),
            profile: {
                id: user._id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                role: user.role,
                bio: user.bio,
                college: user.college,
                location: user.location,
                headline: user.headline || "",
                year: user.year || "",
                links: serializeLinks(user.links),
                pastHackathons: serializePastHackathons(user.pastHackathons),
                skills: user.skills,
                skillProficiency: serializeSkillProficiency(user.skillProficiency),
                preferences: user.preferences,
                avatarUrl: user.avatarUrl,
                availability: user.availability,
                lookingForTeam: user.lookingForTeam,
                discoverable: user.discoverable,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            hackathonTracking: trackingData
        };

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="hackhub-data-export.json"'
        );

        return res.status(200).json(exportData);
    } catch (error) {
        console.error("Data export error:", error);

        return res.status(500).json({
            message: "Unable to export user data"
        });
    }
};

module.exports = {
    getMyProfile,
    saveOnboarding,
    updateMyProfile,
    getPublicProfile,
    updateMySkills,
    uploadAvatar,
    changePassword,
    revokeAllSessions,
    deleteMyAccount,
    exportMyData
};
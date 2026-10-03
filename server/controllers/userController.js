const mongoose = require("mongoose");

const User = require("../models/User");
const skillTaxonomy = require("../utils/skillTaxonomy");
const { updateProfileSchema, updateSkillsSchema} = require("../validators/userValidator");
const cloudinary = require("../config/cloudinary");

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
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                bio: user.bio,
                college: user.college,
                location: user.location,
                skills: user.skills,
                preferences: user.preferences,
                avatarUrl: user.avatarUrl
    }
});

    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            message: "Server error"
        });
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

const { name, bio, college, location, preferences } = validation.data;
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
        
        if (preferences !== undefined) {
            user.preferences = preferences;
        }
        await user.save();

        console.log(`Profile updated for user: ${user.email}`);

        return res.status(200).json({
    message: "Profile updated successfully",
    user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        college: user.college,
        location: user.location,
        skills: user.skills,
        preferences: user.preferences,
        avatarUrl: user.avatarUrl
    }
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

        const user = await User.findById(id).select(
            "name bio college location skills avatarUrl"
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
            user
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

module.exports = {
    getMyProfile,
    updateMyProfile,
    getPublicProfile,
    updateMySkills,
    uploadAvatar
};


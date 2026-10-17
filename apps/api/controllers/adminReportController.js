
const User = require("../models/User");
const Hackathon = require("../models/Hackathon");
const Registration = require("../models/Registration");

// Get admin dashboard report
const getAdminReport = async (req, res) => {
    try {
        const [
            totalUsers,
            bannedUsers,
            totalHackathons,
            activeHackathons,
            hiddenHackathons,
            featuredHackathons,
            totalRegistrations
        ] = await Promise.all([
            User.countDocuments({ deletedAt: null }),
            User.countDocuments({
                deletedAt: null,
                banned: true
            }),
            Hackathon.countDocuments({}),
            Hackathon.countDocuments({ is_active: true }),
            Hackathon.countDocuments({ is_hidden: true }),
            Hackathon.countDocuments({ is_featured: true }),
            Registration.countDocuments({ registered: true })
        ]);

        return res.status(200).json({
            message: "Admin report retrieved successfully",
            report: {
                users: {
                    total: totalUsers,
                    banned: bannedUsers,
                    notBanned: totalUsers - bannedUsers
                },
                hackathons: {
                    total: totalHackathons,
                    active: activeHackathons,
                    hidden: hiddenHackathons,
                    featured: featuredHackathons
                },
                registrations: {
                    total: totalRegistrations
                },
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Admin report error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    getAdminReport
};

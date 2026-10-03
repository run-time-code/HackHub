const mongoose = require("mongoose");
const Registration = require("../models/Registration");

const getDashboardSummary = async (req, res) => {
    try {
        const now = new Date();

        const sevenDaysLater = new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000
        );

        const result = await Registration.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(req.user.id)
                }
            },
            {
                $lookup: {
                    from: "Hackathons",
                    localField: "hackathon",
                    foreignField: "hackathon_id",
                    as: "hackathonDetails"
                }
            },
            {
                $unwind: "$hackathonDetails"
            },
            {
                $addFields: {
                    deadlineDate: {
                        $dateFromString: {
                            dateString:
                                "$hackathonDetails.registration_deadline",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $addFields: {
                    status: {
                        $cond: [
                            {
                                $and: [
                                    {
                                        $ne: [
                                            "$deadlineDate",
                                            null
                                        ]
                                    },
                                    {
                                        $gte: [
                                            "$deadlineDate",
                                            now
                                        ]
                                    }
                                ]
                            },
                            "ongoing",
                            "completed"
                        ]
                    }
                }
            },
            {
                $facet: {
                    statusCounts: [
                        {
                            $group: {
                                _id: "$status",
                                count: {
                                    $sum: 1
                                }
                            }
                        }
                    ],

                    upcomingDeadlines: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $gte: [
                                                "$deadlineDate",
                                                now
                                            ]
                                        },
                                        {
                                            $lte: [
                                                "$deadlineDate",
                                                sevenDaysLater
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                hackathon:
                                    "$hackathonDetails.hackathon_id",
                                title:
                                    "$hackathonDetails.title",
                                registration_deadline:
                                    "$hackathonDetails.registration_deadline",
                                deadlineDate: 1
                            }
                        },
                        {
                            $sort: {
                                deadlineDate: 1
                            }
                        },
                        {
                            $project: {
                                hackathon: 1,
                                title: 1,
                                registration_deadline: 1
                            }
                        }
                    ]
                }
            }
        ]);

        console.log(
            `Dashboard summary retrieved for user: ${req.user.id}`
        );

        return res.status(200).json({
            message: "Dashboard summary retrieved successfully",
            statusCounts: result[0].statusCounts,
            upcomingDeadlines: result[0].upcomingDeadlines
        });

    } catch (error) {
        console.error("Dashboard summary error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    getDashboardSummary
};
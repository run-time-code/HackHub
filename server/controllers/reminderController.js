const Reminder = require("../models/Reminder");

const createReminder = async (req, res) => {
    try {
        const { hackathonId, eventDate, remindAt } = req.body;

        if (!hackathonId || !eventDate || !remindAt) {
            console.log("Please enter the details");
            return res.status(400).json({
                message: "hackathonId, eventDate and remindAt are required"
            });
        }

        const event = new Date(eventDate);
        const reminder = new Date(remindAt);

        if (isNaN(event.getTime()) || isNaN(reminder.getTime())) {
            console.log("Invalid date format");
            return res.status(400).json({
                message: "Invalid date format"
            });
        }

        if (reminder >= event) {
            console.log("Reminder time must be before the event");
            return res.status(400).json({
                message: "Reminder time must be before the event"
            });
        }

        const newReminder = await Reminder.create({
            user: req.user.id,
            hackathonId,
            eventDate: event,
            remindAt: reminder
        });
     console.log("Reminder created successfully");
        res.status(201).json({
           
            message: "Reminder created successfully",
            reminder: newReminder
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


const getReminders = async (req, res) => {
    try {
        const reminders = await Reminder.find({
            user: req.user.id
        }).sort({ remindAt: 1 });

        res.status(200).json({
            reminders
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};
const deleteReminder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message: "Reminder ID is required"
            });
        }

        const reminder = await Reminder.findOneAndDelete({
            _id: id,
            user: req.user.id
        });

        if (!reminder) {
            return res.status(404).json({
                message: "Reminder not found"
            });
        }
        console.log("Reminder deleted successfully");

        res.status(200).json({
            message: "Reminder deleted successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};
module.exports = { createReminder , getReminders, deleteReminder };
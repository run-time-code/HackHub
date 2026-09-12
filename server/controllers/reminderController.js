const createReminder = async (req, res) => {
    try {
        const { hackathonId, eventDate, remindAt } = req.body;

        if (!hackathonId || !eventDate || !remindAt) {
            return res.status(400).json({
                message: "hackathonId, eventDate and remindAt are required"
            });
        }

        const event = new Date(eventDate);
        const reminder = new Date(remindAt);

        if (isNaN(event.getTime()) || isNaN(reminder.getTime())) {
            return res.status(400).json({
                message: "Invalid date format"
            });
        }

        if (reminder >= event) {
            return res.status(400).json({
                message: "Reminder time must be before the event"
            });
        }

        res.status(201).json({
            message: "Reminder request is valid",
            reminder: {
                hackathonId,
                eventDate: event.toISOString(),
                remindAt: reminder.toISOString()
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
};


const getReminders = async (req, res) => {
    try {
        res.status(200).json({
            reminders: []
        });
    } catch (error) {
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

        res.status(200).json({
            message: "Reminder deletion request is valid",
            reminderId: id
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = { createReminder , getReminders, deleteReminder };
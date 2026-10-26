const test = require("node:test");
const assert = require("node:assert/strict");
const {
    validateReminderPreferenceUpdate
} = require("../controllers/userController");

test("reminder preference updates accept supported values", () => {
    assert.equal(
        validateReminderPreferenceUpdate({
            enabled: false,
            emailReminders: true,
            registrationDeadlineHours: [24, 72],
            timeZone: "America/New_York"
        }),
        null
    );
});

test("reminder preference updates reject invalid offsets and unknown fields", () => {
    assert.match(
        validateReminderPreferenceUpdate({ eventStartHours: [-1] }),
        /eventStartHours/
    );
    assert.match(
        validateReminderPreferenceUpdate({ role: "admin" }),
        /Unsupported preference/
    );
    assert.match(
        validateReminderPreferenceUpdate({ timeZone: "not/a-zone" }),
        /IANA time zone/
    );
});

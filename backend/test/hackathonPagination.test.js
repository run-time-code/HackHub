const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
    encodeCursor,
    decodeCursor,
    cursorFilter
} = require("../utils/hackathonPagination");
const { makeCanonicalKey } = require("../utils/canonicalHackathon");

test("cursor preserves the sort value and uses the same sort", () => {
    const record = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        prize: 250
    };
    const cursor = encodeCursor(record, "prize_high");

    assert.deepEqual(decodeCursor(cursor, "prize_high"), {
        value: 250,
        id: "507f1f77bcf86cd799439011"
    });
    assert.throws(
        () => decodeCursor(cursor, "prize_low"),
        /does not match/
    );
});

test("cursor filter advances in the selected field and then the tie-breaker", () => {
    assert.deepEqual(
        cursorFilter("prize_high", {
            value: 250,
            id: "507f1f77bcf86cd799439011"
        }),
        {
            $or: [
                { prize: { $lt: 250 } },
                { prize: 250, _id: { $gt: "507f1f77bcf86cd799439011" } }
            ]
        }
    );
});

test("deadline cursor handles null deadlines before dated results", () => {
    assert.deepEqual(
        cursorFilter("deadline", {
            value: null,
            id: "507f1f77bcf86cd799439011"
        }),
        {
            $or: [
                { registrationDeadline: { $ne: null } },
                {
                    registrationDeadline: null,
                    _id: { $gt: "507f1f77bcf86cd799439011" }
                }
            ]
        }
    );
});

test("newest cursor sorts older timestamps and equal timestamps backward by id", () => {
    assert.deepEqual(
        cursorFilter("newest", {
            value: new Date("2026-01-01T00:00:00.000Z"),
            id: "507f1f77bcf86cd799439011"
        }),
        {
            $or: [
                { createdAt: { $lt: new Date("2026-01-01T00:00:00.000Z") } },
                {
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    _id: { $lt: "507f1f77bcf86cd799439011" }
                }
            ]
        }
    );
});

test("canonical key normalizes title and organizer and requires an event date", () => {
    assert.equal(
        makeCanonicalKey(" Spring  Hack ", "ACME, Inc.", "2026-06-15T12:00:00Z"),
        "spring hack|acme inc|2026-06-15"
    );
    assert.equal(makeCanonicalKey("Spring Hack", "ACME", null), null);
});

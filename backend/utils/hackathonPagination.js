const mongoose = require("mongoose");

const SORTS = {
    default: { field: "_id", direction: 1, sort: { _id: 1 } },
    deadline: {
        field: "registrationDeadline",
        direction: 1,
        sort: { registrationDeadline: 1, _id: 1 }
    },
    prize_high: { field: "prize", direction: -1, sort: { prize: -1, _id: 1 } },
    prize_low: { field: "prize", direction: 1, sort: { prize: 1, _id: 1 } },
    newest: { field: "createdAt", direction: -1, sort: { createdAt: -1, _id: -1 } }
};

const encodeCursor = (record, sortName) => {
    const sort = SORTS[sortName] || SORTS.default;
    const value = record[sort.field];

    return Buffer.from(JSON.stringify({
        sort: sortName,
        value: value instanceof Date ? value.toISOString() : value,
        id: String(record._id)
    })).toString("base64url");
};

const decodeCursor = (cursor, sortName) => {
    let decoded;
    try {
        decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    } catch (error) {
        throw new Error("cursor must be a valid pagination cursor");
    }

    if (
        !decoded ||
        decoded.sort !== sortName ||
        !mongoose.isValidObjectId(decoded.id) ||
        !Object.prototype.hasOwnProperty.call(decoded, "value")
    ) {
        throw new Error("cursor does not match the requested sort");
    }

    const sort = SORTS[sortName] || SORTS.default;
    let value = decoded.value;
    if (sort.field === "registrationDeadline" || sort.field === "createdAt") {
        value = value === null ? null : new Date(value);
        if (value !== null && Number.isNaN(value.getTime())) {
            throw new Error("cursor contains an invalid date");
        }
    } else if (sort.field === "prize" && !Number.isFinite(value)) {
        throw new Error("cursor contains an invalid prize value");
    }

    return { value, id: decoded.id };
};

const cursorFilter = (sortName, cursor) => {
    const sort = SORTS[sortName] || SORTS.default;
    const tieDirection = sortName === "newest" ? "$lt" : "$gt";
    const clauses = [];

    if (sort.field === "_id") {
        clauses.push({ _id: { $gt: cursor.id } });
    } else if (cursor.value === null) {
        clauses.push({ [sort.field]: { $ne: null } });
        clauses.push({
            [sort.field]: null,
            _id: { [tieDirection]: cursor.id }
        });
    } else {
        clauses.push({
            [sort.field]: {
                [sort.direction === 1 ? "$gt" : "$lt"]: cursor.value
            }
        });
        clauses.push({
            [sort.field]: cursor.value,
            _id: { [tieDirection]: cursor.id }
        });
    }

    return { $or: clauses };
};

module.exports = {
    SORTS,
    encodeCursor,
    decodeCursor,
    cursorFilter
};

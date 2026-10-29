const makeCanonicalKey = (title, organizerName, eventStartDate) => {
    if (!eventStartDate) {
        return null;
    }

    const normalize = (value) =>
        String(value || "")
            .normalize("NFKC")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();

    const date = new Date(eventStartDate);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return [
        normalize(title),
        normalize(organizerName),
        date.toISOString().slice(0, 10)
    ].join("|");
};

module.exports = { makeCanonicalKey };

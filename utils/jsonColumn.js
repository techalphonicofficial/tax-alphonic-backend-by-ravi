// MariaDB stores JSON columns as LONGTEXT, so mysql2 hands them back as strings.
// Use as a model attribute getter to always expose parsed values.
const parseJsonColumn = (fieldName, fallback = null) => function () {
    const value = this.getDataValue(fieldName);
    if (typeof value !== 'string') return value ?? fallback;
    try {
        return JSON.parse(value);
    } catch (e) {
        return fallback;
    }
};

module.exports = { parseJsonColumn };

const successResponse = (res, message, data = {}, pagination = null, statusCode = 200) => {
    const response = {
        success: true,
        message,
        data,
        errors: [],
    };
    if (pagination) {
        response.pagination = pagination;
    }
    return res.status(statusCode).json(response);
};

const errorResponse = (res, message, errors = [], statusCode = 400) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
    });
};

module.exports = {
    successResponse,
    errorResponse
};

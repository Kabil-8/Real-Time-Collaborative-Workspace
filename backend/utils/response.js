/**
 * Standardised API response helpers
 */

const successResponse = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

const errorResponse = (res, message = "Something went wrong", statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

const paginatedResponse = (res, data, meta) => {
  return res.status(200).json({
    success: true,
    data,
    meta, // { page, limit, total, totalPages }
  });
};

module.exports = { successResponse, errorResponse, paginatedResponse };

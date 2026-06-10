const { validationResult } = require("express-validator");
const { errorResponse } = require("../utils/response");

/**
 * handleValidationErrors — attach after express-validator chains
 * Returns 422 with a structured errors array if validation fails
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return errorResponse(res, "Validation failed.", 422, formatted);
  }
  next();
};

module.exports = { handleValidationErrors };

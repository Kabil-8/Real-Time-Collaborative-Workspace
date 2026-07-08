const { validationResult } = require("express-validator");
const { errorResponse } = require("../utils/response");

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return errorResponse(res, "Validation failed", 422, errors.array());
}

module.exports = validate;
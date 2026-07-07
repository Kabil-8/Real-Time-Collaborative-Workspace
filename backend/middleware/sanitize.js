const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

/**
 * sanitizeMiddleware — ordered chain of security sanitizers:
 *  1. mongoSanitize — strips Mongo operator keys ($, .) from req.body/params/query
 *  2. xss           — escapes HTML entities in req.body to prevent XSS
 *  3. hpp           — removes duplicate query-string params (HTTP Parameter Pollution)
 */
const sanitizeMiddleware = [
  mongoSanitize({
    replaceWith: "_",  // replace rather than remove, so field keys stay intact
    onSanitize: ({ req, key }) => {
      console.warn(`⚠️  Mongo injection attempt blocked — key: ${key}, IP: ${req.ip}`);
    },
  }),
  xss(),
  hpp({
    // Allow arrays for these specific query parameters
    whitelist: ["type", "status", "priority", "assignees", "labels"],
  }),
];

module.exports = sanitizeMiddleware;

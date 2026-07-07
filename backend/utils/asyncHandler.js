/**
 * asyncHandler — DRY wrapper that forwards thrown errors to Express's next().
 * Replaces boilerplate try/catch in every controller function.
 *
 * Usage:
 *   exports.myController = asyncHandler(async (req, res) => {
 *     const data = await SomeModel.find();
 *     res.json({ data });
 *   });
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

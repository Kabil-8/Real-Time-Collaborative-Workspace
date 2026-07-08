const ORDER_STEP = 1024;
const MIN_GAP = 0.0001;

function orderBetween(prev, next) {
  if (prev == null && next == null) return ORDER_STEP;
  if (prev == null) return next - ORDER_STEP;
  if (next == null) return prev + ORDER_STEP;
  return (prev + next) / 2;
}

function needsRebalance(prev, next) {
  if (prev == null || next == null) return false;
  return Math.abs(next - prev) < MIN_GAP;
}

module.exports = { ORDER_STEP, MIN_GAP, orderBetween, needsRebalance };
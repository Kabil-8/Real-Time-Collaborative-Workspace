const { verifyToken } = require("../utils/jwt");
const { errorResponse } = require("../utils/response");
const Workspace = require("../models/Workspace");

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return errorResponse(res, "Missing bearer token", 401);
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return errorResponse(res, "Invalid or expired token", 401);
  }
}

async function requireWorkspaceMember(req, res, next) {
  try {
    const wsId = req.params.workspaceId || req.params.id || req.body.workspaceId;
    if (!wsId) return errorResponse(res, "workspaceId required", 400);
    const ws = await Workspace.findById(wsId).lean();
    if (!ws) return errorResponse(res, "Workspace not found", 404);
    const m = ws.members.find((mm) => String(mm.userId) === String(req.userId));
    if (!m) return errorResponse(res, "Not a workspace member", 403);
    req.workspace = ws;
    req.workspaceRole = m.role;
    next();
  } catch (err) {
    next(err);
  }
}

function requireWorkspaceAdmin(req, res, next) {
  if (req.workspaceRole !== "owner" && req.workspaceRole !== "admin") {
    return errorResponse(res, "Admin privileges required", 403);
  }
  next();
}

module.exports = { protect, requireWorkspaceMember, requireWorkspaceAdmin };
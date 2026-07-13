const crypto = require("crypto");
const Workspace = require("../models/Workspace");
const User = require("../models/User");
const Board = require("../models/Board");
const Card = require("../models/Card");
const { successResponse, errorResponse } = require("../utils/response");
const { sendWorkspaceInvite } = require("../utils/mailer");

function slugify(name) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "workspace";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createWorkspace(req, res, next) {
  try {
    const { name } = req.body;
    const ws = await Workspace.create({
      name,
      slug: slugify(name),
      ownerId: req.userId,
      members: [{ userId: req.userId, role: "owner" }],
    });
    return successResponse(res, { workspace: ws }, 201);
  } catch (err) {
    next(err);
  }
}

async function listMyWorkspaces(req, res, next) {
  try {
    const list = await Workspace.find({ "members.userId": req.userId })
      .sort({ updatedAt: -1 })
      .lean();
    return successResponse(res, { workspaces: list });
  } catch (err) {
    next(err);
  }
}

async function getWorkspace(req, res, next) {
  try {
    const ws = req.workspace;
    const users = await User.find({ _id: { $in: ws.members.map((m) => m.userId) } }).lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const members = ws.members.map((m) => {
      const u = byId.get(String(m.userId));
      return {
        userId: String(m.userId),
        role: m.role,
        name: u ? u.name : "Unknown",
        email: u ? u.email : "",
        avatarUrl: (u && u.avatarUrl) || "",
      };
    });
    return successResponse(res, { workspace: { ...ws, members } });
  } catch (err) {
    next(err);
  }
}

async function searchWorkspace(req, res, next) {
  try {
    const query = req.query.q.trim();
    if (query.length < 2) return successResponse(res, { boards: [], cards: [] });
    const match = new RegExp(escapeRegex(query), "i");
    const [boards, cards] = await Promise.all([
      Board.find({ workspaceId: req.workspace._id, $or: [{ name: match }, { description: match }] })
        .select("name description")
        .limit(10)
        .lean(),
      Card.find({ $or: [{ title: match }, { description: match }], boardId: { $in: await Board.find({ workspaceId: req.workspace._id }).distinct("_id") } })
        .select("title description boardId listId dueDate")
        .limit(20)
        .lean(),
    ]);
    return successResponse(res, { boards, cards });
  } catch (err) {
    next(err);
  }
}

async function updateWorkspace(req, res, next) {
  try {
    const { name } = req.body;
    const ws = await Workspace.findByIdAndUpdate(
      req.params.id,
      name ? { name } : {},
      { new: true }
    );
    return successResponse(res, { workspace: ws });
  } catch (err) {
    next(err);
  }
}

async function inviteMember(req, res, next) {
  try {
    const { email, role = "member" } = req.body;
    const workspace = req.workspace;
    const existingUser = await User.findOne({ email }).select({ _id: 1 }).lean();
    if (existingUser && workspace.members.some((member) => String(member.userId) === String(existingUser._id))) {
      return errorResponse(res, "This person is already a workspace member", 409);
    }
    if (workspace.invites.some((invite) => invite.email === email)) {
      return errorResponse(res, "An invitation has already been sent to this email address", 409);
    }

    const token = crypto.randomBytes(24).toString("hex");
    await sendWorkspaceInvite({
      email,
      workspaceName: workspace.name,
      role,
      token,
    });
    await Workspace.findByIdAndUpdate(req.params.id, {
      $push: { invites: { token, email, role } },
    });
    return successResponse(res, { token, email, role, emailSent: true }, 201);
  } catch (err) {
    next(err);
  }
}

async function acceptInvite(req, res, next) {
  try {
    const { token } = req.body;
    const ws = await Workspace.findOne({ "invites.token": token });
    if (!ws) return errorResponse(res, "Invalid invite", 404);
    const invite = ws.invites.find((i) => i.token === token);
    const already = ws.members.some((m) => String(m.userId) === String(req.userId));
    if (!already) {
      ws.members.push({ userId: req.userId, role: invite.role });
    }
    ws.invites = ws.invites.filter((i) => i.token !== token);
    await ws.save();
    return successResponse(res, { workspace: ws });
  } catch (err) {
    next(err);
  }
}

async function listInvites(req, res, next) {
  try {
    const ws = req.workspace;
    return successResponse(res, { invites: ws.invites || [] });
  } catch (err) {
    next(err);
  }
}

async function revokeInvite(req, res, next) {
  try {
    await Workspace.findByIdAndUpdate(req.params.id, {
      $pull: { invites: { token: req.params.token } },
    });
    return successResponse(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

async function updateMemberRole(req, res, next) {
  try {
    const { role } = req.body;
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return errorResponse(res, "Workspace not found", 404);
    const target = ws.members.find((m) => String(m.userId) === String(req.params.userId));
    if (!target) return errorResponse(res, "Member not found", 404);
    if (target.role === "owner") return errorResponse(res, "Cannot change the owner's role", 400);
    if (role === "owner") return errorResponse(res, "Cannot assign owner role", 400);
    target.role = role;
    await ws.save();
    return successResponse(res, { member: target });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return errorResponse(res, "Workspace not found", 404);
    const targetId = String(req.params.userId);
    const target = ws.members.find((m) => String(m.userId) === targetId);
    if (!target) return errorResponse(res, "Member not found", 404);
    if (target.role === "owner") return errorResponse(res, "Owner cannot be removed", 400);
    const isSelf = targetId === String(req.userId);
    const isAdmin = req.workspaceRole === "owner" || req.workspaceRole === "admin";
    if (!isSelf && !isAdmin) return errorResponse(res, "Admin privileges required", 403);
    ws.members = ws.members.filter((m) => String(m.userId) !== targetId);
    await ws.save();
    return successResponse(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createWorkspace,
  listMyWorkspaces,
  getWorkspace,
  searchWorkspace,
  updateWorkspace,
  inviteMember,
  acceptInvite,
  listInvites,
  revokeInvite,
  updateMemberRole,
  removeMember,
};

const isWorkspaceAdmin = (workspace, userId) => {
  return workspace.members.some(
    (member) =>
      member.user.toString() === userId.toString() &&
      member.role === "admin"
  );
};

module.exports = { isWorkspaceAdmin };
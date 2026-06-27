/**
 * socket/presenceManager.js
 *
 * In-memory presence tracker.
 *
 * Responsibilities:
 *   - Map each userId → Set of socketIds (a user can have multiple tabs open)
 *   - Map each socketId → userId (fast reverse lookup on disconnect)
 *   - Track which board rooms each socket has joined
 *   - Expose helpers to query room presence counts / lists
 *
 * This intentionally avoids any Redis dependency for Day 1–2.
 * The data structure is designed so it can be swapped for Redis in Week 4
 * without changing any of the handler logic.
 *
 * Data model:
 *   userSockets  : Map<userId, Set<socketId>>
 *   socketUser   : Map<socketId, { userId, user }>
 *   socketRooms  : Map<socketId, Set<roomKey>>   (e.g. "board:abc123")
 *   roomMembers  : Map<roomKey, Set<userId>>
 */

class PresenceManager {
  constructor() {
    /** @type {Map<string, Set<string>>} userId → Set of socketIds */
    this.userSockets = new Map();

    /** @type {Map<string, { userId: string, user: object }>} socketId → user info */
    this.socketUser = new Map();

    /** @type {Map<string, Set<string>>} socketId → Set of joined roomKeys */
    this.socketRooms = new Map();

    /** @type {Map<string, Set<string>>} roomKey → Set of userIds present */
    this.roomMembers = new Map();
  }

  // ─── Registration ───────────────────────────────────────────────────────────

  /**
   * Register a new socket connection for a user.
   * @param {string} socketId
   * @param {object} user   - The safe user profile from socket.user
   */
  addSocket(socketId, user) {
    const userId = user._id;

    // userId → socketId mapping
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);

    // socketId → user mapping
    this.socketUser.set(socketId, { userId, user });

    // Pre-allocate the rooms set for this socket
    this.socketRooms.set(socketId, new Set());
  }

  /**
   * Remove a socket and clean up all associated state.
   * @param {string} socketId
   * @returns {{ userId: string, user: object, vacatedRooms: string[] } | null}
   */
  removeSocket(socketId) {
    const entry = this.socketUser.get(socketId);
    if (!entry) return null;

    const { userId, user } = entry;
    const vacatedRooms = [];

    // Remove socket from every room it was in
    const rooms = this.socketRooms.get(socketId) || new Set();
    for (const roomKey of rooms) {
      this._removeUserFromRoom(roomKey, userId, socketId);
      vacatedRooms.push(roomKey);
    }

    // Remove socket-level entries
    this.socketRooms.delete(socketId);
    this.socketUser.delete(socketId);

    // Remove from userSockets; delete the key if no more sockets remain
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    return { userId, user, vacatedRooms };
  }

  // ─── Room management ────────────────────────────────────────────────────────

  /**
   * Record that a socket joined a room.
   * @param {string} socketId
   * @param {string} roomKey   e.g. "board:abc123"
   * @returns {boolean}  true if this is the user's first socket in the room
   */
  joinRoom(socketId, roomKey) {
    const entry = this.socketUser.get(socketId);
    if (!entry) return false;

    const { userId } = entry;

    // Track room on socket level
    const rooms = this.socketRooms.get(socketId);
    if (rooms) rooms.add(roomKey);

    // Track user on room level
    if (!this.roomMembers.has(roomKey)) {
      this.roomMembers.set(roomKey, new Set());
    }
    const members = this.roomMembers.get(roomKey);
    const wasAbsent = !members.has(userId);
    members.add(userId);

    return wasAbsent; // true = first socket for this user in this room
  }

  /**
   * Record that a socket left a room.
   * @param {string} socketId
   * @param {string} roomKey
   * @returns {boolean}  true if the user no longer has any sockets in the room
   */
  leaveRoom(socketId, roomKey) {
    const entry = this.socketUser.get(socketId);
    if (!entry) return false;

    const { userId } = entry;

    const rooms = this.socketRooms.get(socketId);
    if (rooms) rooms.delete(roomKey);

    return this._removeUserFromRoom(roomKey, userId, socketId);
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  /**
   * Get all distinct user IDs currently present in a room.
   * @param {string} roomKey
   * @returns {string[]}
   */
  getRoomUserIds(roomKey) {
    const members = this.roomMembers.get(roomKey);
    return members ? [...members] : [];
  }

  /**
   * Get the number of connected sockets for a user.
   * @param {string} userId
   * @returns {number}
   */
  getUserSocketCount(userId) {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size : 0;
  }

  /**
   * Check whether a user currently has any active socket.
   * @param {string} userId
   * @returns {boolean}
   */
  isUserOnline(userId) {
    return this.getUserSocketCount(userId) > 0;
  }

  /**
   * Get the user info attached to a socket.
   * @param {string} socketId
   * @returns {object|null}
   */
  getUserBySocket(socketId) {
    const entry = this.socketUser.get(socketId);
    return entry ? entry.user : null;
  }

  /**
   * Snapshot stats — useful for health checks and debugging.
   * @returns {object}
   */
  getStats() {
    return {
      connectedSockets: this.socketUser.size,
      onlineUsers: this.userSockets.size,
      activeRooms: this.roomMembers.size,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Remove a userId from a room's member set, but only if the user has no
   * other sockets still present in that room.
   *
   * @returns {boolean}  true if the user was fully removed from the room
   */
  _removeUserFromRoom(roomKey, userId, leavingSocketId) {
    const members = this.roomMembers.get(roomKey);
    if (!members) return false;

    // Check whether the user still has other sockets in this room
    const stillPresent = [...(this.userSockets.get(userId) || [])]
      .filter((sid) => sid !== leavingSocketId)
      .some((sid) => {
        const rooms = this.socketRooms.get(sid);
        return rooms && rooms.has(roomKey);
      });

    if (!stillPresent) {
      members.delete(userId);
      if (members.size === 0) {
        this.roomMembers.delete(roomKey);
      }
      return true;
    }

    return false;
  }
}

// Export a singleton so all handlers share the same state
module.exports = new PresenceManager();

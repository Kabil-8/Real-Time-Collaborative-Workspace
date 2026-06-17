/**
 * listsApi.js
 * ────────────────────────────────────────────────────────────────
 * Typed wrappers around every Lists REST endpoint.
 * All functions return the inner payload (list / lists / {})
 * and throw on error so callers can catch uniformly.
 */
import api from "./api";

// ── Read ────────────────────────────────────────────────────────

/** GET /api/lists/board/:boardId → { lists } */
export const fetchListsByBoard = async (boardId) => {
  const { data } = await api.get(`/lists/board/${boardId}`);
  return data.lists;
};

/** GET /api/lists/:listId → { list } */
export const fetchList = async (listId) => {
  const { data } = await api.get(`/lists/${listId}`);
  return data.list;
};

// ── Create ──────────────────────────────────────────────────────

/**
 * POST /api/lists → { list }
 * @param {{ title: string, boardId: string, color?: string }} payload
 */
export const createList = async (payload) => {
  const { data } = await api.post("/lists", payload);
  return data.list;
};

// ── Update ──────────────────────────────────────────────────────

/**
 * PATCH /api/lists/:listId → { list }
 * Supports: title, color, wipLimit
 */
export const updateList = async (listId, updates) => {
  const { data } = await api.patch(`/lists/${listId}`, updates);
  return data.list;
};

/**
 * PATCH /api/lists/:listId/move → {}
 * @param {string} listId
 * @param {number} newPosition
 */
export const moveList = async (listId, newPosition) => {
  await api.patch(`/lists/${listId}/move`, { newPosition });
};

// ── Archive / Restore ───────────────────────────────────────────

/**
 * DELETE /api/lists/:listId → {} (soft archive)
 */
export const archiveList = async (listId) => {
  await api.delete(`/lists/${listId}`);
};

/**
 * PATCH /api/lists/:listId/restore → { list }
 */
export const restoreList = async (listId) => {
  const { data } = await api.patch(`/lists/${listId}/restore`);
  return data.list;
};

// ── Duplicate ───────────────────────────────────────────────────

/**
 * POST /api/lists/:listId/duplicate → { list }
 */
export const duplicateList = async (listId) => {
  const { data } = await api.post(`/lists/${listId}/duplicate`);
  return data.list;
};

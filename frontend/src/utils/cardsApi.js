/**
 * cardsApi.js
 * ────────────────────────────────────────────────────────────────
 * Typed wrappers around every Cards REST endpoint.
 * All functions return the inner payload and throw on error.
 */
import api from "./api";

// ── Read ────────────────────────────────────────────────────────

/** GET /api/cards/list/:listId → { cards } */
export const fetchCardsByList = async (listId) => {
  const { data } = await api.get(`/cards/list/${listId}`);
  return data.cards;
};

/** GET /api/cards/:cardId → { card } (full detail) */
export const fetchCard = async (cardId) => {
  const { data } = await api.get(`/cards/${cardId}`);
  return data.card;
};

// ── Create ──────────────────────────────────────────────────────

/**
 * POST /api/cards → { card }
 * @param {{ title, listId, boardId, description?, priority?, dueDate?, assignees? }} payload
 */
export const createCard = async (payload) => {
  const { data } = await api.post("/cards", payload);
  return data.card;
};

// ── Update ──────────────────────────────────────────────────────

/**
 * PATCH /api/cards/:cardId → { card }
 * Supports: title, description, priority, dueDate, coverColor, assignees, labels
 */
export const updateCard = async (cardId, updates) => {
  const { data } = await api.patch(`/cards/${cardId}`, updates);
  return data.card;
};

/**
 * PATCH /api/cards/:cardId/move → { card }
 * @param {string} cardId
 * @param {{ targetListId?: string, newPosition?: number }} params
 */
export const moveCard = async (cardId, params) => {
  const { data } = await api.patch(`/cards/${cardId}/move`, params);
  return data.card;
};

// ── Archive / Restore ───────────────────────────────────────────

/** DELETE /api/cards/:cardId → {} (soft archive) */
export const archiveCard = async (cardId) => {
  await api.delete(`/cards/${cardId}`);
};

/** PATCH /api/cards/:cardId/restore → { card } */
export const restoreCard = async (cardId) => {
  const { data } = await api.patch(`/cards/${cardId}/restore`);
  return data.card;
};

// ── Duplicate ───────────────────────────────────────────────────

/** POST /api/cards/:cardId/duplicate → { card } */
export const duplicateCard = async (cardId) => {
  const { data } = await api.post(`/cards/${cardId}/duplicate`);
  return data.card;
};

// ── Comments ────────────────────────────────────────────────────

/** POST /api/cards/:cardId/comments → { comment } */
export const addComment = async (cardId, text) => {
  const { data } = await api.post(`/cards/${cardId}/comments`, { text });
  return data.comment;
};

/** PATCH /api/cards/:cardId/comments/:commentId → { comment } */
export const editComment = async (cardId, commentId, text) => {
  const { data } = await api.patch(`/cards/${cardId}/comments/${commentId}`, { text });
  return data.comment;
};

/** DELETE /api/cards/:cardId/comments/:commentId → {} */
export const deleteComment = async (cardId, commentId) => {
  await api.delete(`/cards/${cardId}/comments/${commentId}`);
};

// ── Checklists ──────────────────────────────────────────────────

/** POST /api/cards/:cardId/checklists → { checklist } */
export const addChecklist = async (cardId, title) => {
  const { data } = await api.post(`/cards/${cardId}/checklists`, { title });
  return data.checklist;
};

/** DELETE /api/cards/:cardId/checklists/:checklistId → {} */
export const deleteChecklist = async (cardId, checklistId) => {
  await api.delete(`/cards/${cardId}/checklists/${checklistId}`);
};

// ── Checklist Items ─────────────────────────────────────────────

/** POST /api/cards/:cardId/checklists/:checklistId/items → { item } */
export const addChecklistItem = async (cardId, checklistId, text) => {
  const { data } = await api.post(
    `/cards/${cardId}/checklists/${checklistId}/items`,
    { text }
  );
  return data.item;
};

/**
 * PATCH /api/cards/:cardId/checklists/:checklistId/items/:itemId → { item }
 * @param {{ text?: string, completed?: boolean }} updates
 */
export const updateChecklistItem = async (cardId, checklistId, itemId, updates) => {
  const { data } = await api.patch(
    `/cards/${cardId}/checklists/${checklistId}/items/${itemId}`,
    updates
  );
  return data.item;
};

/** DELETE /api/cards/:cardId/checklists/:checklistId/items/:itemId → {} */
export const deleteChecklistItem = async (cardId, checklistId, itemId) => {
  await api.delete(`/cards/${cardId}/checklists/${checklistId}/items/${itemId}`);
};

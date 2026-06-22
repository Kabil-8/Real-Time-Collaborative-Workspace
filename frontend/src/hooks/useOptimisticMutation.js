/**
 * useOptimisticMutation.js
 * ─────────────────────────────────────────────────────────────────
 * Reusable hook for optimistic UI updates with server confirmation.
 *
 * Pattern:
 *   1. Apply snapshot of state BEFORE mutation
 *   2. Apply optimistic update immediately
 *   3. Fire async mutation function
 *   4a. On success → merge server response (replaces temp data)
 *   4b. On failure → rollback to snapshot + call onError
 *
 * Concurrent safety:
 *   Each call gets a unique token. If the same entity is mutated
 *   again before the first settles, the earlier call is "cancelled"
 *   and its resolve/reject won't trigger a state change.
 *
 * Usage:
 *   const { mutate, pendingIds } = useOptimisticMutation();
 *
 *   mutate({
 *     entityId: list._id,                         // for pendingIds tracking
 *     optimisticUpdate: () => setLists(newLists), // applied instantly
 *     mutationFn: () => updateList(id, data),     // server call
 *     onSuccess: (serverData) => mergeFn(serverData),
 *     onError: (err, snapshot) => rollbackFn(snapshot),
 *     getSnapshot: () => currentState,            // optional snapshot
 *   });
 */

import { useCallback, useRef, useState } from "react";

const useOptimisticMutation = () => {
  // Track pending IDs: Set<string>
  const [pendingIds, setPendingIds] = useState(new Set());

  // Map of entityId → current token (to cancel superseded mutations)
  const activeTokens = useRef(new Map());

  // Counter for unique tokens
  const tokenCounter = useRef(0);

  const addPending = useCallback((id) => {
    setPendingIds((prev) => new Set([...prev, id]));
  }, []);

  const removePending = useCallback((id) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  /**
   * mutate({
   *   entityId,        – string  (list._id or card._id)
   *   optimisticUpdate – fn()    applied IMMEDIATELY
   *   mutationFn       – async fn() → serverResult
   *   onSuccess        – fn(serverResult)   called on confirmed
   *   onError          – fn(err, snapshot)  called on failure
   *   getSnapshot      – fn() → snapshot   optional; if provided,
   *                      snapshot is passed to onError for rollback
   * })
   */
  const mutate = useCallback(
    async ({
      entityId,
      optimisticUpdate,
      mutationFn,
      onSuccess,
      onError,
      getSnapshot,
    }) => {
      // Capture snapshot BEFORE the optimistic update
      const snapshot = getSnapshot ? getSnapshot() : null;

      // Create a unique token for this mutation call
      const token = ++tokenCounter.current;
      activeTokens.current.set(entityId, token);

      // ── Apply optimistic update immediately ──
      if (optimisticUpdate) optimisticUpdate();

      // ── Mark as pending ──
      addPending(entityId);

      try {
        const result = await mutationFn();

        // Check if this call has been superseded by a newer mutation
        if (activeTokens.current.get(entityId) !== token) return;

        // ── Server confirmed — merge ──
        if (onSuccess) onSuccess(result);
      } catch (err) {
        // Check if superseded
        if (activeTokens.current.get(entityId) !== token) return;

        // ── Server rejected — rollback ──
        if (onError) onError(err, snapshot);
      } finally {
        // Only clean up pending if this is still the active token
        if (activeTokens.current.get(entityId) === token) {
          activeTokens.current.delete(entityId);
          removePending(entityId);
        }
      }
    },
    [addPending, removePending]
  );

  return { mutate, pendingIds };
};

export default useOptimisticMutation;

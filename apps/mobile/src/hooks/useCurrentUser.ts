/**
 * useCurrentUser — Returns the current Firebase Auth user's UID.
 * Centralizes the `auth.currentUser` access pattern that is repeated
 * in every screen. Returns `null` when not authenticated.
 */
import { auth } from "../config/firebase";

export function useCurrentUser() {
  const user = auth.currentUser;
  return user?.uid ?? null;
}

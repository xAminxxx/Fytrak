/**
 * useCurrentUser — Returns the current Firebase Auth user's UID.
 * Centralizes the `auth.currentUser` access pattern that is repeated
 * in every screen. Returns `null` when not authenticated.
 */
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";

let currentUid: string | null = auth.currentUser?.uid ?? null;
const listeners = new Set<(uid: string | null) => void>();
let unsubscribeAuth: (() => void) | null = null;

const notify = () => {
  listeners.forEach((listener) => listener(currentUid));
};

const ensureListener = () => {
  if (unsubscribeAuth) return;
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUid = user?.uid ?? null;
    notify();
  });
};

export function useCurrentUser() {
  const [uid, setUid] = useState(currentUid);

  useEffect(() => {
    ensureListener();
    listeners.add(setUid);

    return () => {
      listeners.delete(setUid);
      if (listeners.size === 0 && unsubscribeAuth) {
        unsubscribeAuth();
        unsubscribeAuth = null;
      }
    };
  }, []);

  return uid;
}

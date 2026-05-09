/**
 * useUserProfile — Subscribes to the current user's profile from Firestore.
 * Encapsulates the subscribeToUserProfile pattern used in 4+ screens.
 */
import { useEffect, useState } from "react";
import { subscribeToUserProfile, type UserProfile } from "../services/profileService";
import { useCurrentUser } from "./useCurrentUser";

export function useUserProfile() {
  const uid = useCurrentUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserProfile(uid, (data) => {
      setProfile(data);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [uid]);

  return { profile, isLoading };
}

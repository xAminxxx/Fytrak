/**
 * useUserProfile — Subscribes to the current user's profile from Firestore.
 * Encapsulates the subscribeToUserProfile pattern used in 4+ screens.
 */
import { useEffect, useState } from "react";
import { subscribeWithCache } from "../data/subscriptions/subscriptionCache";
import { subscribeToUserProfile, type UserProfile } from "../services/profileService";
import { useCurrentUser } from "./useCurrentUser";

export function useUserProfile() {
  const uid = useCurrentUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    return subscribeWithCache<UserProfile | null>(
      `profile:${uid}`,
      (emit) => subscribeToUserProfile(uid, emit),
      (data) => {
        setProfile(data);
        setIsLoading(false);
      }
    );
  }, [uid]);

  return { profile, isLoading };
}

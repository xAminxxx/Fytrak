/**
 * useBodyMetrics — Subscribes to the latest body metrics (weight, body fat).
 * Encapsulates the subscribeToLatestMetrics pattern.
 */
import { useEffect, useState } from "react";
import { subscribeToLatestMetrics, type BodyMetric } from "../services/profileService";
import { useCurrentUser } from "./useCurrentUser";

export function useBodyMetrics() {
  const uid = useCurrentUser();
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToLatestMetrics(uid, (data) => {
      setMetrics(data);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [uid]);

  return { metrics, isLoading };
}

import { useEffect, useState } from "react";
import { subscribeToDailyWater } from "../services/waterService";
import { useCurrentUser } from "./useCurrentUser";

export function useDailyWater() {
  const uid = useCurrentUser();
  const [water, setWater] = useState(0);

  useEffect(() => {
    if (!uid) return;
    return subscribeToDailyWater(uid, setWater);
  }, [uid]);

  return water;
}

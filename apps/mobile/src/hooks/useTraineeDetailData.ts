import { useState, useEffect, useMemo } from "react";
import {
    subscribeToDailyMeals,
    subscribeToWorkouts,
    subscribeToLatestMetrics,
    subscribeToHistoricalMeals,
    subscribeToProgressPhotos,
    subscribeToUserProfile,
    type Meal,
    type WorkoutLog,
    type BodyMetric,
    type ProgressPhoto,
    type UserProfile
} from "../services/userSession";

export function useTraineeDetailData(traineeId: string) {
    const [meals, setMeals] = useState<Meal[]>([]);
    const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
    const [metrics, setMetrics] = useState<BodyMetric[]>([]);
    const [historicalMeals, setHistoricalMeals] = useState<Meal[]>([]);
    const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
    const [traineeProfile, setTraineeProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!traineeId) return;

        const unsubMeals = subscribeToDailyMeals(traineeId, setMeals);
        const unsubWorkouts = subscribeToWorkouts(traineeId, setWorkouts);
        const unsubHistory = subscribeToHistoricalMeals(traineeId, 7, setHistoricalMeals);
        const unsubPhotos = subscribeToProgressPhotos(traineeId, setPhotos);
        const unsubMetrics = subscribeToLatestMetrics(traineeId, (data) => {
            setMetrics(data);
            setIsLoading((prev) => (traineeProfile ? false : prev));
        });
        const unsubTraineeProfile = subscribeToUserProfile(traineeId, (data) => {
            setTraineeProfile(data);
            setIsLoading(false);
        });

        return () => {
            unsubMeals();
            unsubWorkouts();
            unsubHistory();
            unsubPhotos();
            unsubMetrics();
            unsubTraineeProfile();
        };
    }, [traineeId]);

    const stats = useMemo(() => {
        const totalWorkouts = workouts.length;
        const avgCals = meals.length > 0 ? (meals.reduce((sum, m) => sum + (m.calories || 0), 0) / meals.length).toFixed(0) : "0";
        const latestWeight = metrics.length > 0 ? metrics[0].weight : undefined;

        return { totalWorkouts, avgCals, latestWeight };
    }, [workouts, meals, metrics]);

    return {
        meals,
        workouts,
        metrics,
        historicalMeals,
        photos,
        traineeProfile,
        isLoading,
        stats
    };
}

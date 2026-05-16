import { useState, useEffect, useMemo, useCallback } from "react";
import { Alert } from "react-native";
import { subscribeWithCache } from "../data/subscriptions/subscriptionCache";
import {
    fetchCoachClientSignals,
    respondToTraineeRequest,
    subscribeToCoachTrainees,
    subscribeToPendingCoachRequests,
    type CoachTrainee,
} from "../services/userSession";
import { useCurrentUser } from "./useCurrentUser";
import {
    buildCoachDashboardIntelligence,
    type CoachClientSignal,
    type CoachClientIntelligence
} from "../features/coaching/coachIntelligence";

export function useCoachDashboard() {
    const uid = useCurrentUser();
    const [trainees, setTrainees] = useState<CoachTrainee[]>([]);
    const [pendingRequests, setPendingRequests] = useState<CoachTrainee[]>([]);
    const [clientSignals, setClientSignals] = useState<CoachClientSignal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingSignals, setIsLoadingSignals] = useState(false);

    useEffect(() => {
        if (!uid) return;

        setIsLoading(true);
        const unsubscribe = subscribeWithCache<CoachTrainee[]>(
            `coachTrainees:${uid}`,
            (emit) => subscribeToCoachTrainees(uid, emit),
            (data) => {
                setTrainees(data);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [uid]);

    useEffect(() => {
        if (!uid) return;

        const unsubscribe = subscribeWithCache<CoachTrainee[]>(
            `coachPendingRequests:${uid}`,
            (emit) => subscribeToPendingCoachRequests(uid, (requests) => {
                emit(requests.map((request) => ({
                    id: request.traineeId,
                    name: request.traineeName,
                    profile: {
                        goal: request.traineeGoal,
                        goalText: request.traineeGoal,
                    },
                    assignmentStatus: "pending",
                    selectedCoachId: uid,
                })));
            }),
            setPendingRequests
        );

        return () => unsubscribe();
    }, [uid]);

    const pending = pendingRequests;
    const assigned = useMemo(() => trainees.filter(t => t.assignmentStatus === "assigned"), [trainees]);

    useEffect(() => {
        let isMounted = true;

        if (assigned.length === 0) {
            setClientSignals([]);
            return;
        }

        setIsLoadingSignals(true);
        fetchCoachClientSignals(assigned)
            .then((signals) => {
                if (isMounted) setClientSignals(signals);
            })
            .catch((error) => {
                console.error("Failed to load coach intelligence:", error);
                if (isMounted) setClientSignals([]);
            })
            .finally(() => {
                if (isMounted) setIsLoadingSignals(false);
            });

        return () => {
            isMounted = false;
        };
    }, [assigned]);

    const dashboard = useMemo(() => buildCoachDashboardIntelligence(clientSignals), [clientSignals]);

    const clientIntelligenceById = useMemo(() => {
        return new Map<string, CoachClientIntelligence>(dashboard.clients.map((client) => [client.traineeId, client]));
    }, [dashboard.clients]);

    const atRiskClients = useMemo(() => {
        return dashboard.clients.filter((client) => client.risk !== "low");
    }, [dashboard.clients]);

    const recentActivity = useMemo(() => {
        return dashboard.clients
            .filter((client) => client.lastWorkoutAt)
            .sort((a, b) => {
                const aTime = a.lastWorkoutAt ? a.lastWorkoutAt.getTime() : 0;
                const bTime = b.lastWorkoutAt ? b.lastWorkoutAt.getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, 4);
    }, [dashboard.clients]);

    const checkInsDue = useMemo(() => {
        return dashboard.clients.filter((client) => client.risk === "high").length;
    }, [dashboard.clients]);

    const unreadMessages = useMemo(() => {
        return assigned.reduce((sum, trainee) => sum + (trainee.clientSummary?.unreadCoachCount || 0), 0);
    }, [assigned]);

    const stats = useMemo(() => {
        return {
            totalClients: assigned.length,
            newLeads: pending.length,
            consistency: dashboard.avgCompliance,
        };
    }, [assigned.length, dashboard.avgCompliance, pending.length]);

    const insights = useMemo(() => {
        if (pending.length > 0) {
            return [
                {
                    title: "New Opportunity",
                    sub: `${pending.length} pending request${pending.length === 1 ? "" : "s"} waiting for your review.`,
                    icon: "mail-outline",
                    tone: "warning" as const,
                },
                ...dashboard.insights,
            ];
        }
        return dashboard.insights;
    }, [dashboard.insights, pending.length]);

    const handleAction = useCallback(async (traineeId: string, name: string, accept: boolean) => {
        const action = accept ? "Accept" : "Reject";
        Alert.alert(
            `${action} Request`,
            `Do you want to ${action.toLowerCase()} ${name}'s request?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: action,
                    style: accept ? "default" : "destructive",
                    onPress: async () => {
                        try {
                            await respondToTraineeRequest(traineeId, accept);
                        } catch (error) {
                            console.error(`Failed to ${action} trainee:`, error);
                            Alert.alert("Error", `Could not ${action.toLowerCase()} request.`);
                        }
                    }
                }
            ]
        );
    }, []);

    return {
        trainees,
        pending,
        assigned,
        isLoading,
        isLoadingSignals,
        stats,
        insights,
        unreadMessages,
        checkInsDue,
        atRiskClients,
        recentActivity,
        clientIntelligenceById,
        handleAction,
    };
}

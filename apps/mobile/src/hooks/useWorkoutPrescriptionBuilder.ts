import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import {
    savePrescribedWorkout,
    CoachTemplate,
    subscribeToCoachTemplates,
    WorkoutSetType
} from "../services/userSession";
import { searchAscendExercises } from "../services/exerciseMediaService";
import { EXERCISE_LIBRARY, ExerciseLibraryItem, t as tEx } from "../constants/exercises";

export type PrescribedExerciseInput = {
    name: string;
    type: WorkoutSetType;
    targetSets: number;
    targetReps: string;
    restTime: string;
};

export function useWorkoutPrescriptionBuilder(traineeId: string, navigation: any) {
    const [title, setTitle] = useState("");
    const [exercises, setExercises] = useState<PrescribedExerciseInput[]>([
        { name: "", type: "WEIGHT_REPS", targetSets: 4, targetReps: "10-12", restTime: "60s" }
    ]);
    const [templates, setTemplates] = useState<CoachTemplate[]>([]);
    const [libModalVisible, setLibModalVisible] = useState(false);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [libSearchQuery, setLibSearchQuery] = useState("");

    // EXERCISE LIBRARY STATES
    const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
    const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
    const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
    const [selectedExerciseInfo, setSelectedExerciseInfo] = useState<ExerciseLibraryItem | null>(null);
    const [dbExercises, setDbExercises] = useState<ExerciseLibraryItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(libSearchQuery.toLowerCase())
    );

    useEffect(() => {
        if (exerciseSearchQuery.length < 2) {
            setDbExercises([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const q = query(
                    collection(db, "exercises"),
                    where("nameLower", ">=", exerciseSearchQuery.toLowerCase()),
                    where("nameLower", "<=", exerciseSearchQuery.toLowerCase() + "\uf8ff"),
                    limit(20)
                );
                const querySnapshot = await getDocs(q);
                const results: ExerciseLibraryItem[] = [];
                querySnapshot.forEach((exerciseDoc) => {
                    results.push(exerciseDoc.data() as ExerciseLibraryItem);
                });

                const apiResults = await searchAscendExercises(exerciseSearchQuery, 20).catch((error) => {
                    console.warn("AscendAPI search failed:", error);
                    return [] as ExerciseLibraryItem[];
                });
                const seenIds = new Set(results.map((exercise) => exercise.id));
                const merged = [
                    ...results,
                    ...apiResults.filter((exercise) => !seenIds.has(exercise.id))
                ];
                setDbExercises(merged);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [exerciseSearchQuery]);

    const filteredExercises = [
        ...EXERCISE_LIBRARY.filter(ex =>
            tEx(ex.name).toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
            ex.muscleGroup.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
            ex.equipment.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
        ),
        ...dbExercises.filter(dbEx => !EXERCISE_LIBRARY.some(localEx => localEx.id === dbEx.id))
    ].slice(0, 30);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const unsubscribe = subscribeToCoachTemplates(user.uid, "workout", (data) => {
            setTemplates(data);
        });
        return () => unsubscribe();
    }, []);

    const applyTemplate = (t: CoachTemplate) => {
        setTitle(t.title);
        if (t.data.exercises) {
            setExercises(t.data.exercises);
        }
        setLibModalVisible(false);
    };

    const findExerciseInfo = (exerciseName: string) => {
        const normalizedName = exerciseName.trim().toLowerCase();
        return [...EXERCISE_LIBRARY, ...dbExercises].find((candidate) => {
            return tEx(candidate.name).trim().toLowerCase() === normalizedName;
        }) ?? null;
    };

    const applyExerciseSelection = (exercise: ExerciseLibraryItem) => {
        const targetReps = exercise.defaultType === "TIME" ? "60" : "10-12";
        const next = {
            name: tEx(exercise.name),
            type: exercise.defaultType,
            targetSets: 4,
            targetReps: targetReps,
            restTime: "60s",
        };

        if (activeExerciseIndex === null) {
            setExercises((prev) => [...prev, next]);
            return;
        }

        const updated = [...exercises];
        updated[activeExerciseIndex] = { ...updated[activeExerciseIndex], ...next };
        setExercises(updated);
    };

    const addCustomExercise = (name: string) => {
        const customName = name.trim() || "Custom Exercise";
        const next = {
            name: customName,
            type: "WEIGHT_REPS" as WorkoutSetType,
            targetSets: 4,
            targetReps: "10-12",
            restTime: "60s",
        };

        if (activeExerciseIndex === null) {
            setExercises((prev) => [...prev, next]);
            return;
        }

        const updated = [...exercises];
        updated[activeExerciseIndex] = { ...updated[activeExerciseIndex], ...next };
        setExercises(updated);
    };

    const addExercise = () => {
        setExercises([...exercises, { name: "", type: "WEIGHT_REPS", targetSets: 4, targetReps: "10-12", restTime: "60s" }]);
    };

    const updateExercise = (index: number, field: string, value: any) => {
        const newEx = [...exercises];
        newEx[index] = { ...newEx[index], [field]: value };
        setExercises(newEx);
    };

    const removeExercise = (index: number) => {
        const newEx = exercises.filter((_, i) => i !== index);
        setExercises(newEx.length ? newEx : [{ name: "", type: "WEIGHT_REPS", targetSets: 4, targetReps: "10-12", restTime: "60s" }]);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Missing Title", "Please give this workout a name (e.g., Upper Body A)");
            return;
        }
        if (exercises.some(e => !e.name.trim())) {
            Alert.alert("Missing Exercise", "Please fill in all exercise names.");
            return;
        }

        try {
            setIsSubmitting(true);
            const user = auth.currentUser;
            if (!user) throw new Error("No coach session");

            await savePrescribedWorkout(traineeId, {
                coachId: user.uid,
                coachName: user.displayName || "Your Coach",
                title: title.trim(),
                exercises: exercises,
                isCompleted: false
            });

            if (saveAsTemplate) {
                const { saveCoachTemplate } = require("../services/userSession");
                await saveCoachTemplate(user.uid, {
                    title: title.trim(),
                    type: "workout",
                    data: { exercises }
                });
            }

            Alert.alert("Success", "Workout prescribed successfully!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to assign workout.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        title,
        setTitle,
        exercises,
        templates,
        libModalVisible,
        setLibModalVisible,
        saveAsTemplate,
        setSaveAsTemplate,
        isSubmitting,
        libSearchQuery,
        setLibSearchQuery,
        filteredTemplates,
        exerciseModalVisible,
        setExerciseModalVisible,
        exerciseSearchQuery,
        setExerciseSearchQuery,
        activeExerciseIndex,
        setActiveExerciseIndex,
        selectedExerciseInfo,
        setSelectedExerciseInfo,
        dbExercises,
        isSearching,
        filteredExercises,
        applyTemplate,
        findExerciseInfo,
        applyExerciseSelection,
        addCustomExercise,
        addExercise,
        updateExercise,
        removeExercise,
        handleSave
    };
}

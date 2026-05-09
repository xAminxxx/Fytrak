import { appEnv } from "../config/env";
import type { ExerciseLibraryItem, LocalizedString } from "../constants/exercises";
import type { WorkoutSetType } from "./workoutService";

const ASCEND_BASE_URL = `https://${appEnv.rapidApi.ascendApiHost}`;
const REQUEST_TIMEOUT_MS = 9000;

type AscendExercise = {
  id?: string;
  exerciseId?: string;
  name?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  bodyParts?: string[];
  bodyPart?: string;
  equipments?: string[];
  equipment?: string;
  exerciseType?: string;
  mechanicsType?: string;
  instructions?: string[];
  overview?: string;
};

const muscleGroupMap: Record<string, ExerciseLibraryItem["muscleGroup"]> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
  abs: "Core",
  cardio: "Cardio",
  "full body": "Full Body",
};

const equipmentMap: Record<string, ExerciseLibraryItem["equipment"]> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  kettlebell: "Kettlebell",
  none: "None",
};

const toLocalized = (value: string): LocalizedString => ({
  en: value,
  fr: value,
  ar: value,
});

const normalize = (value?: string): string => (value || "").trim().toLowerCase();

const mapMuscleGroup = (exercise: AscendExercise): ExerciseLibraryItem["muscleGroup"] => {
  const raw = normalize(exercise.bodyParts?.[0] || exercise.bodyPart);
  return muscleGroupMap[raw] || "Full Body";
};

const mapEquipment = (exercise: AscendExercise): ExerciseLibraryItem["equipment"] => {
  const raw = normalize(exercise.equipments?.[0] || exercise.equipment);
  return equipmentMap[raw] || "None";
};

const mapSetType = (exerciseType?: string): WorkoutSetType => {
  const raw = normalize(exerciseType);
  if (raw.includes("time")) return "TIME";
  if (raw.includes("body")) return "BODYWEIGHT";
  if (raw.includes("rep") && !raw.includes("weight")) return "REPS_ONLY";
  return "WEIGHT_REPS";
};

const mapMechanics = (mechanicsType?: string): ExerciseLibraryItem["mechanicsType"] => {
  const raw = normalize(mechanicsType);
  if (raw.includes("compound")) return "Compound";
  if (raw.includes("isolation")) return "Isolation";
  return undefined;
};

const toExerciseLibraryItem = (exercise: AscendExercise): ExerciseLibraryItem | null => {
  const name = exercise.name?.trim();
  if (!name) return null;

  return {
    id: exercise.exerciseId || exercise.id || `ascend-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name: toLocalized(name),
    muscleGroup: mapMuscleGroup(exercise),
    equipment: mapEquipment(exercise),
    defaultType: mapSetType(exercise.exerciseType),
    mechanicsType: mapMechanics(exercise.mechanicsType),
    videoUrl: exercise.videoUrl,
    thumbnailUrl: exercise.thumbnailUrl || exercise.imageUrl,
    instructions: exercise.instructions?.map(toLocalized),
  };
};

const requestAscendApi = async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
  if (!appEnv.rapidApi.key) {
    return [] as T;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = new URL(path, ASCEND_BASE_URL);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": appEnv.rapidApi.ascendApiHost,
        "x-rapidapi-key": appEnv.rapidApi.key,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AscendAPI request failed with ${response.status}`);
    }

    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
};

const unwrapExerciseList = (payload: unknown): AscendExercise[] => {
  if (Array.isArray(payload)) return payload as AscendExercise[];
  if (payload && typeof payload === "object") {
    const data = payload as { data?: unknown; exercises?: unknown; results?: unknown };
    if (Array.isArray(data.data)) return data.data as AscendExercise[];
    if (Array.isArray(data.exercises)) return data.exercises as AscendExercise[];
    if (Array.isArray(data.results)) return data.results as AscendExercise[];
  }
  return [];
};

export const searchAscendExercises = async (search: string, limit = 20): Promise<ExerciseLibraryItem[]> => {
  const query = search.trim();
  if (query.length < 2 || !appEnv.rapidApi.key) return [];

  const payload = await requestAscendApi<unknown>("/api/v1/exercises/search", {
    search: query,
    q: query,
    limit,
  });

  return unwrapExerciseList(payload)
    .map(toExerciseLibraryItem)
    .filter((exercise): exercise is ExerciseLibraryItem => Boolean(exercise))
    .slice(0, limit);
};

export const fetchAscendBodyParts = async (): Promise<string[]> => {
  const payload = await requestAscendApi<unknown>("/api/v1/bodyparts");
  if (Array.isArray(payload)) return payload.map(String);
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return ((payload as { data: unknown[] }).data).map(String);
  }
  return [];
};

import { AssignmentStatus, UserRole } from "../state/types";

export type ProfileLevel = "Beginner" | "Intermediate" | "Advanced";

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  profileImageUrl?: string;
  bio?: string;
  gender?: "male" | "female" | null;
  goal?: string;
  level?: ProfileLevel;
  injuries?: string;
  weight?: number;
  height?: number;
  birthDate?: string;
  activityLevel?: string;
  city?: string;
  country?: string;
  workoutProfileCompleted?: boolean;
  nutritionProfileCompleted?: boolean;
  isPremium?: boolean;
  lastTrainedDate?: string;
  assignmentStatus?: AssignmentStatus;
  selectedCoachId?: string | null;
  selectedCoachName?: string | null;
  macroTargets?: MacroTargets;
  lifestyle?: Lifestyle;
  medical?: Medical;
  nutrition?: NutritionPreferences;
  work?: WorkEnvironment;
  coachProfile?: CoachProfile;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface Lifestyle {
  smoker: boolean;
  cigarettesPerDay: number;
  coffeePerDay: number;
  alcoholPerDay: number;
  sleepHours: number;
  sleepTiming: string;
}

export interface Medical {
  allergies: string;
  medications: string;
}

export interface NutritionPreferences {
  specificDishes: string;
  supplements: string;
  regularEating: boolean;
}

export interface WorkEnvironment {
  toughness: number;
  timing: string;
  stress: number;
}

export interface CoachProfile {
  bio: string;
  specialties: string[];
  experience: number;
  rating?: number;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time: string;
  date: string;
  imageUrl?: string;
  createdAt?: any;
}

export interface PrescribedMeal {
  id: string;
  coachId: string;
  coachName: string;
  title: string;
  description?: string;
  macros: MacroTargets;
  isApplied: boolean;
  assignedAt: any;
}

export type WorkoutSetType = "WEIGHT_REPS" | "TIME" | "BODYWEIGHT" | "REPS_ONLY";

export interface WorkoutSet {
  type: WorkoutSetType;
  reps?: number;
  weight?: number;
  durationSec?: number;
  rpe?: string;
  isCompleted: boolean;
}

export interface WorkoutLog {
  id: string;
  name: string;
  date?: string;
  exercises: {
    name: string;
    sets: WorkoutSet[];
  }[];
  duration?: number;
  totalVolume?: number;
  checkIn?: {
    energy: number;
    soreness: number;
    mood: number;
  };
  createdAt?: any;
}

export interface PrescribedWorkout {
  id: string;
  coachId: string;
  coachName: string;
  title: string;
  description?: string;
  exercises: {
    name: string;
    type?: WorkoutSetType;
    targetSets: number;
    targetReps: string;
    restTime?: string;
  }[];
  isCompleted: boolean;
  assignedAt: any;
}

export interface BodyMetric {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  createdAt?: any;
}

export interface Program {
  id: string;
  coachId: string;
  coachName: string;
  title: string;
  description: string;
  level: ProfileLevel;
  weeks: ProgramWeek[];
}

export interface ProgramWeek {
  weekNumber: number;
  sessions: ProgramSession[];
}

export interface ProgramSession {
  id: string;
  title: string;
  dayNumber: number;
  isCompleted: boolean;
}

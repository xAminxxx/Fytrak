/**
 * User Session — Barrel re-export for backward compatibility.
 *
 * ARCHITECTURE NOTE (FSD):
 * This file now serves as a re-export hub. All domain logic has been
 * extracted into dedicated services:
 *
 *   profileService.ts  — User profiles, sessions, metrics, photos
 *   workoutService.ts  — Workout logging, prescribed workouts
 *   nutritionService.ts — Meal logging, prescribed meals
 *   coachService.ts    — Coach profiles, trainee management, templates
 *   programService.ts  — Multi-week program hierarchy
 *
 * Existing imports from "../../services/userSession" continue to work
 * without any changes. New code should import from the specific service.
 */

// Re-export everything from domain services
export * from "./profileService";
export * from "./workoutService";
export * from "./nutritionService";
export * from "./coachService";
export * from "./programService";
export * from "./subscriptionService";

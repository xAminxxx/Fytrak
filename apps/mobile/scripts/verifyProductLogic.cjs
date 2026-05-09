const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;

  module._compile(output, filename);
};

const src = path.join(__dirname, "..", "src");

const { buildTodayMission } = require(path.join(src, "features", "retention", "todayMission.ts"));
const { scoreCoachClient, buildCoachDashboardIntelligence } = require(path.join(src, "features", "coaching", "coachIntelligence.ts"));
const {
  detectWorkoutPersonalRecords,
  duplicateSetForNextEntry,
  getBestEstimatedOneRepMaxForExercise,
  getLatestExercisePerformance,
} = require(path.join(src, "features", "workouts", "workoutPerformance.ts"));
const { getExerciseVideoLink } = require(path.join(src, "utils", "videoLinks.ts"));

const mission = buildTodayMission({
  hasWorkoutToday: false,
  caloriesLogged: 1200,
  calorieTarget: 2000,
  hasCoachAssigned: true,
  hasPendingWorkoutPlan: true,
  hasPendingMealPlan: false,
  hasBodyMetricToday: false,
});

assert.equal(mission.completionPercent, 25);
assert.equal(mission.items[0].id, "workout");

const atRiskClient = scoreCoachClient({
  traineeId: "trainee-1",
  traineeName: "Sam",
  assignmentStatus: "assigned",
  workoutsLast7Days: 0,
  mealsLast7Days: 1,
  avgDailyProtein: 65,
  proteinTarget: 140,
  lastWorkoutAt: null,
});

assert.equal(atRiskClient.risk, "high");
assert.ok(atRiskClient.suggestedNudge.length > 10);

const dashboard = buildCoachDashboardIntelligence([atRiskClient]);
assert.equal(dashboard.highRiskCount, 1);
assert.equal(dashboard.insights[0].tone, "warning");

const prs = detectWorkoutPersonalRecords(
  [{ name: "Bench Press", sets: [{ type: "weighted", reps: 5, weight: 100, isCompleted: true }] }],
  [{ exercises: [{ name: "Bench Press", sets: [{ type: "weighted", reps: 5, weight: 90, isCompleted: true }] }] }]
);

assert.equal(prs.length, 1);
assert.equal(prs[0].exerciseName, "Bench Press");

assert.deepEqual(duplicateSetForNextEntry({ type: "weighted", reps: 8, weight: 50, isCompleted: true }, "weighted"), {
  type: "weighted",
  reps: 8,
  weight: 50,
  durationSec: undefined,
  rpe: undefined,
  isCompleted: false,
});

const previousPerformance = getLatestExercisePerformance("Bench Press", [
  {
    name: "Push Day",
    exercises: [
      {
        name: "Bench Press",
        sets: [
          { type: "WEIGHT_REPS", reps: 8, weight: 80, isCompleted: true },
          { type: "WEIGHT_REPS", reps: 6, weight: 85, isCompleted: true },
        ],
      },
    ],
  },
]);

assert.equal(previousPerformance.workoutName, "Push Day");
assert.equal(previousPerformance.sets.length, 2);
assert.ok(getBestEstimatedOneRepMaxForExercise("Bench Press", [
  {
    exercises: [
      {
        name: "Bench Press",
        sets: [{ type: "WEIGHT_REPS", reps: 5, weight: 100, isCompleted: true }],
      },
    ],
  },
]) > 110);

const youtubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const videoLink = getExerciseVideoLink(youtubeUrl);
assert.equal(videoLink?.isYouTube, true);
assert.equal(videoLink?.watchUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
assert.ok(videoLink?.thumbnailUrl?.includes("img.youtube.com"));

console.log("Product logic checks passed.");

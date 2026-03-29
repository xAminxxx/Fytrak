import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator, Alert } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import {
  saveMealLog,
  subscribeToDailyMeals,
  deleteMealLog,
  subscribeToUserProfile,
  subscribeToPrescribedMeals,
  applyPrescribedMeal,
  type Meal,
  type UserProfile,
  type PrescribedMeal
} from "../../services/userSession";

export function NutritionScreen() {
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [prescribed, setPrescribed] = useState<PrescribedMeal[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applyingPlanId, setApplyingPlanId] = useState<string | null>(null);

  // --- NUTRITION INTAKE STATE ---
  const [showIntake, setShowIntake] = useState(false);
  const [activityLevel, setActivityLevel] = useState("Moderate");
  const [allergies, setAllergies] = useState("");
  const [meds, setMeds] = useState("");
  const [smoker, setSmoker] = useState(false);
  const [cigs, setCigs] = useState(0);
  const [coffee, setCoffee] = useState(1);
  const [alcohol, setAlcohol] = useState(0);
  const [sleep, setSleep] = useState(7);
  const [sleepTiming, setSleepTiming] = useState("");
  const [dishes, setDishes] = useState("");
  const [supps, setSupps] = useState("");
  const [isSavingIntake, setIsSavingIntake] = useState(false);

  useEffect(() => {
    if (profile && profile.nutritionProfileCompleted !== true) {
      setShowIntake(true);
    }
  }, [profile]);

  const handleSaveIntake = async () => {
    if (!auth.currentUser) return;
    try {
      setIsSavingIntake(true);
      const { saveNutritionIntake } = require("../../services/userSession");
      await saveNutritionIntake(auth.currentUser.uid, {
        activityLevel,
        medical: { allergies, medications: meds },
        lifestyle: { smoker, cigarettesPerDay: cigs, coffeePerDay: coffee, alcoholPerDay: alcohol, sleepHours: sleep, sleepTiming },
        nutrition: { specificDishes: dishes, supplements: supps, regularEating: true }
      });
      setShowIntake(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Error", "Failed to save nutrition details.");
    } finally {
      setIsSavingIntake(false);
    }
  };

  // --- RENDERING ---

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubMeals = subscribeToDailyMeals(user.uid, (data) => {
      setMeals(data);
      setIsLoading((prev) => (profile ? false : prev));
    });

    const unsubProfile = subscribeToUserProfile(user.uid, (data) => {
      setProfile(data);
      setIsLoading(false);
    });

    const unsubPrescribed = subscribeToPrescribedMeals(user.uid, (data) => {
      setPrescribed(data);
    });

    return () => {
      unsubMeals();
      unsubProfile();
      unsubPrescribed();
    };
  }, []);

  const targets = useMemo(() => {
    return profile?.macroTargets || {
      calories: 2100,
      protein: 160,
      carbs: 220,
      fats: 65,
    };
  }, [profile]);

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
      }),
      { calories: 0, protein: 0 }
    );
  }, [meals]);

  const canSave = useMemo(() => {
    return mealName.trim().length > 1 && Number(calories) > 0;
  }, [mealName, calories]);

  const handleSaveMeal = async () => {
    if (!canSave) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await saveMealLog(user.uid, {
        name: mealName.trim(),
        calories: Number(calories),
        protein: Number(protein) || 0,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      setMealName("");
      setCalories("");
      setProtein("");
    } catch (error) {
      console.error("Failed to save meal:", error);
      Alert.alert("Error", "Could not save meal log.");
    }
  };

  const handleDeleteMeal = (id: string, name: string) => {
    Alert.alert("Delete Meal", `Remove "${name}" from your log?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (auth.currentUser) {
            await deleteMealLog(auth.currentUser.uid, id);
          }
        }
      },
    ]);
  };

  const handleApplyCoachPlan = async (plan: PrescribedMeal) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      setApplyingPlanId(plan.id);
      await applyPrescribedMeal(uid, plan.id, plan.macros);
      Alert.alert("Success", "Daily macro targets updated based on your coach's plan.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to apply plan.");
    } finally {
      setApplyingPlanId(null);
    }
  };

  if (showIntake) {
    return (
      <ScreenShell title="Nutrition" subtitle="Medical & Lifestyle intake" contentStyle={styles.shellContent}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.logCard}>
            <SectionTitle title="LIFESTYLE" icon="body" />
            <Text style={styles.label}>Daily Activity Level</Text>
            <View style={styles.groupRow}>
              {["Sedentary", "Moderate", "Active"].map(l => (
                <Pressable key={l} style={[styles.pill, activityLevel === l && styles.pillActive]} onPress={() => setActivityLevel(l)}>
                  <Text style={[styles.pillText, activityLevel === l && styles.pillTextActive]}>{l.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.row}>
              <MetricStepper label="Coffee / Day" value={coffee} onAdjust={(d) => setCoffee(Math.max(0, coffee + d))} />
              <MetricStepper label="Sleep (hrs)" value={sleep} onAdjust={(d) => setSleep(Math.max(2, sleep + d))} />
            </View>

            <SectionTitle title="MEDICAL" icon="medkit" />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Food Allergies</Text>
              <TextInput style={styles.input} placeholder="Lactose, nuts..." placeholderTextColor="#666" value={allergies} onChangeText={setAllergies} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medications / Supplements</Text>
              <TextInput style={styles.input} placeholder="Vitamins, Omega 3..." placeholderTextColor="#666" value={supps} onChangeText={setSupps} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sleep Quality & Timing</Text>
              <TextInput style={styles.input} placeholder="e.g. 11pm - 7am, restless..." placeholderTextColor="#666" value={sleepTiming} onChangeText={setSleepTiming} />
            </View>

            <SectionTitle title="HABITS" icon="cafe" />
            <View style={styles.row}>
              <Pressable style={[styles.pill, smoker && styles.pillActive]} onPress={() => setSmoker(!smoker)}>
                <Text style={[styles.pillText, smoker && styles.pillTextActive]}>{smoker ? "SMOKER: YES" : "SMOKER: NO"}</Text>
              </Pressable>
              {smoker && (
                <MetricStepper label="Cigs / Day" value={cigs} onAdjust={(d) => setCigs(Math.max(1, cigs + d))} />
              )}
            </View>
            <View style={styles.row}>
              <MetricStepper label="Alcohol / Week" value={alcohol} onAdjust={(d) => setAlcohol(Math.max(0, alcohol + d))} />
            </View>

            <SectionTitle title="PREFERENCES" icon="restaurant" />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Any Specific Dishes / Cuisines?</Text>
              <TextInput style={styles.input} placeholder="Mediterranean, Rice & Chicken..." placeholderTextColor="#666" value={dishes} onChangeText={setDishes} />
            </View>

            <Pressable style={[styles.saveBtn, { marginTop: 20 }]} onPress={handleSaveIntake} disabled={isSavingIntake}>
              {isSavingIntake ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>COMPLETE NUTRITION PROFILE</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Nutrition"
      subtitle="Track your macros and daily calorie intake"
      contentStyle={styles.shellContent}
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* SUMMARY CARD */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryTitle}>Calories</Text>
                <Text style={styles.summaryValue}>
                  {totals.calories} <Text style={styles.summaryTarget}>/ {targets.calories} kcal</Text>
                </Text>
              </View>
              <View style={styles.burnRing}>
                <Text style={styles.ringText}>{Math.round((totals.calories / targets.calories) * 100)}%</Text>
              </View>
            </View>

            <View style={styles.macrosRow}>
              <MacroItem label="Protein" current={totals.protein} target={targets.protein} color="#4ade80" icon="barbell" />
              <MacroItem label="Carbs" current={Math.round(totals.calories * 0.4 / 4)} target={targets.carbs} color={colors.primary} icon="restaurant" />
              <MacroItem label="Fats" current={Math.round(totals.calories * 0.25 / 9)} target={targets.fats} color="#f87171" icon="water" />
            </View>
          </View>

          {/* COACH PRESCRIPTION BANNER */}
          {profile?.isPremium && prescribed.length > 0 && (
            <View style={styles.coachBanner}>
              <View style={styles.bannerHeader}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.bannerTitle}>NEW COACH PRESCRIPTION</Text>
              </View>
              <Text style={styles.bannerSubtitle}>{prescribed[0].title}</Text>
              <Text style={styles.bannerDesc}>{prescribed[0].description}</Text>

              <View style={styles.bannerMacros}>
                <View style={styles.bannerMacroItem}>
                  <Text style={styles.macroValText}>{prescribed[0].macros.calories}</Text>
                  <Text style={styles.macroLabelText}>KCALS</Text>
                </View>
                <View style={styles.bannerMacroItem}>
                  <Text style={styles.macroValText}>{prescribed[0].macros.protein}g</Text>
                  <Text style={styles.macroLabelText}>PRO</Text>
                </View>
                <View style={styles.bannerMacroItem}>
                  <Text style={styles.macroValText}>{prescribed[0].macros.carbs}g</Text>
                  <Text style={styles.macroLabelText}>CARBS</Text>
                </View>
              </View>

              <Pressable
                style={styles.applyBtn}
                onPress={() => handleApplyCoachPlan(prescribed[0])}
                disabled={!!applyingPlanId}
              >
                {applyingPlanId === prescribed[0].id ? <ActivityIndicator size="small" color="#000" /> : (
                  <>
                    <Text style={styles.applyBtnText}>APPLY MACRO TARGETS</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#000" />
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* LOG MEAL SECTION */}
          <View style={styles.logCard}>
            <Text style={styles.sectionTitle}>Log a Meal</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="What did you eat?"
                placeholderTextColor="#8c8c8c"
                value={mealName}
                onChangeText={setMealName}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Calories"
                  placeholderTextColor="#8c8c8c"
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Protein (g)"
                  placeholderTextColor="#8c8c8c"
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
              </View>
            </View>
            <Pressable
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              disabled={!canSave}
              onPress={handleSaveMeal}
            >
              <Text style={styles.saveBtnText}>ADD TO LOG</Text>
              <Ionicons name="add-circle" size={20} color={colors.primaryText} />
            </Pressable>
          </View>

          {/* RECENT MEALS */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Today's Log</Text>
            {meals.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No meals logged today yet.</Text>
              </View>
            ) : (
              meals.map((meal) => (
                <Pressable
                  key={meal.id}
                  style={styles.mealItem}
                  onLongPress={() => handleDeleteMeal(meal.id, meal.name)}
                >
                  <View style={styles.mealIcon}>
                    <Ionicons name="fast-food" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealMeta}>{meal.time}</Text>
                  </View>
                  <View style={styles.mealStats}>
                    <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                    <Text style={styles.mealProtein}>{meal.protein}g Protein</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

function MacroItem({ label, current, target, color, icon }: any) {
  const progress = Math.min(current / target, 1);
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroHeader}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>{current}g / {target}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    paddingBottom: 0,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingBottom: 120,
    gap: 20,
  },
  summaryCard: {
    backgroundColor: "#161616",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 24,
    marginTop: 10,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    color: "#8c8c8c",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
  summaryTarget: {
    color: "#444",
    fontSize: 16,
    fontWeight: "700",
  },
  burnRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1c1c1e",
  },
  ringText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  macrosRow: {
    flexDirection: "row",
    gap: 12,
  },
  macroItem: {
    flex: 1,
    gap: 8,
  },
  macroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  macroLabel: {
    color: "#8c8c8c",
    fontSize: 12,
    fontWeight: "700",
  },
  barBg: {
    height: 6,
    backgroundColor: "#2c2c2e",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  macroValue: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  logCard: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 16,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
    backgroundColor: "#333",
  },
  saveBtnText: {
    color: colors.primaryText,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  historySection: {
    gap: 12,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 12,
  },
  mealIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  mealInfo: {
    flex: 1,
    gap: 2,
  },
  mealName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  mealMeta: {
    color: "#8c8c8c",
    fontSize: 12,
    fontWeight: "500",
  },
  mealStats: {
    alignItems: "flex-end",
    gap: 2,
  },
  mealCalories: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  mealProtein: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyBox: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161616",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  emptyText: {
    color: "#444",
    fontSize: 14,
    fontWeight: "600",
  },
  coachBanner: {
    backgroundColor: "#1c221a",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(164, 255, 33, 0.2)",
    gap: 12,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerTitle: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  bannerSubtitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: -4,
  },
  bannerDesc: {
    color: "#8c8c8c",
    fontSize: 13,
    lineHeight: 18,
  },
  bannerMacros: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 16,
    padding: 12,
    justifyContent: "space-between",
  },
  bannerMacroItem: {
    alignItems: "center",
    flex: 1,
  },
  macroValText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  macroLabelText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  applyBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  groupRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pill: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1c1c1e", alignItems: "center", borderWidth: 1, borderColor: "#333" },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: "#8c8c8c", fontSize: 11, fontWeight: "900" },
  pillTextActive: { color: "#000" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 4 },
  sectionTitleText: { color: "#ffffff", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  label: { color: "#8c8c8c", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1e", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#333" },
  stepperBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  stepperValueText: { flex: 1, textAlign: "center", color: "#fff", fontSize: 16, fontWeight: "800" },
});

function SectionTitle({ title, icon }: { title: string, icon: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function MetricStepper({ label, value, onAdjust }: { label: string, value: number, onAdjust: (d: number) => void }) {
  return (
    <View style={[styles.inputGroup, { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperContainer}>
        <Pressable style={styles.stepperBtn} onPress={() => onAdjust(-1)}>
          <Ionicons name="remove" size={18} color={colors.primary} />
        </Pressable>
        <Text style={styles.stepperValueText}>{value}</Text>
        <Pressable style={styles.stepperBtn} onPress={() => onAdjust(1)}>
          <Ionicons name="add" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

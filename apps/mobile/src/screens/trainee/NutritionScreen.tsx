import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator, Alert, Image } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../components/Typography";
import { auth } from "../../config/firebase";
import { NutritionRing } from "../../components/NutritionRing";
import { MacroItem } from "../../components/MacroItem";
import { SectionTitle } from "../../components/SectionTitle";
import { MetricStepper } from "../../components/MetricStepper";
import {
  saveMealLog,
  subscribeToDailyMeals,
  deleteMealLog,
  subscribeToUserProfile,
  subscribeToPrescribedMeals,
  applyPrescribedMeal,
  saveNutritionIntake,
  type Meal,
  type UserProfile,
  type PrescribedMeal
} from "../../services/userSession";
import { uploadMealPhoto } from "../../services/cloudinaryUpload";
import * as ImagePicker from "expo-image-picker";
import { ToastService } from "../../components/Toast";
import { WaterTracker } from "../../components/WaterTracker";
import { LogMealModal } from "../../features/nutrition/components/LogMealModal";

export function NutritionScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [prescribed, setPrescribed] = useState<PrescribedMeal[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applyingPlanId, setApplyingPlanId] = useState<string | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [isSavingMeal, setIsSavingMeal] = useState(false);

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
  const [dishes, setDishes] = useState("");
  const [supps, setSupps] = useState("");
  const [bedtime, setBedtime] = useState(new Date(new Date().setHours(23, 0, 0)));
  const [wakeUpTime, setWakeUpTime] = useState(new Date(new Date().setHours(7, 0, 0)));
  const [isSavingIntake, setIsSavingIntake] = useState(false);
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakeUpPicker, setShowWakeUpPicker] = useState(false);

  useEffect(() => {
    if (profile && profile.nutritionProfileCompleted !== true) {
      setShowIntake(true);
    }
  }, [profile]);

  const handleSaveIntake = async () => {
    if (!auth.currentUser) return;
    try {
      setIsSavingIntake(true);
      await saveNutritionIntake(auth.currentUser.uid, {
        activityLevel,
        medical: { allergies: allergies.trim() || "None", medications: meds.trim() || "None" },
        lifestyle: {
          smoker,
          cigarettesPerDay: Number(cigs),
          coffeePerDay: Number(coffee),
          alcoholPerDay: Number(alcohol),
          sleepHours: Number(sleep),
          sleepTiming: `${bedtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${wakeUpTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        },
        nutrition: { specificDishes: dishes.trim() || "No specific preferences", supplements: supps.trim() || "None", regularEating: true }
      });
      setShowIntake(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      ToastService.error("Error", "Failed to save nutrition details.");
    } finally {
      setIsSavingIntake(false);
    }
  };

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
      unsubMeals(); unsubProfile(); unsubPrescribed();
    };
  }, []);

  const targets = useMemo(() => profile?.macroTargets || { calories: 2100, protein: 160, carbs: 220, fats: 65 }, [profile]);

  const totals = useMemo(() => meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fats: acc.fats + (meal.fats || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  ), [meals]);

  const handleSaveMeal = async (data: any) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setIsSavingMeal(true);
      let imageUrl: string | undefined;
      if (data.imageUri) {
        const result = await uploadMealPhoto(data.imageUri);
        imageUrl = result.secureUrl;
      }
      await saveMealLog(user.uid, {
        name: data.name,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...(imageUrl && { imageUrl }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error(error);
      ToastService.error("Error", "Failed to log meal.");
    } finally {
      setIsSavingMeal(false);
    }
  };

  const handleDeleteMeal = (id: string, name: string) => {
    Alert.alert("Delete Meal", `Remove "${name}" from your log?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { if (auth.currentUser) await deleteMealLog(auth.currentUser.uid, id); } },
    ]);
  };

  const handleApplyCoachPlan = async (plan: PrescribedMeal) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      setApplyingPlanId(plan.id);
      await applyPrescribedMeal(uid, plan.id, plan.macros);
      ToastService.success("Success", "Daily macro targets updated based on your coach's plan.");
    } catch (error) { console.error(error); ToastService.error("Error", "Failed to apply plan."); }
    finally { setApplyingPlanId(null); }
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
            <View style={styles.inputGroup}><Text style={styles.label}>Food Allergies</Text><TextInput style={styles.input} placeholderTextColor="#666" value={allergies} onChangeText={setAllergies} /></View>
            <View style={styles.inputGroup}><Text style={styles.label}>Medications / Supplements</Text><TextInput style={styles.input} placeholderTextColor="#666" value={supps} onChangeText={setSupps} /></View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bedtime & Wake-up</Text>
              <View style={styles.row}>
                <Pressable style={[styles.input, { flex: 1 }]} onPress={() => setShowBedtimePicker(true)}>
                  <Text style={styles.timeText}>{bedtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.miniLabel}>BEDTIME</Text>
                </Pressable>
                <Pressable style={[styles.input, { flex: 1 }]} onPress={() => setShowWakeUpPicker(true)}>
                  <Text style={styles.timeText}>{wakeUpTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.miniLabel}>WAKE-UP</Text>
                </Pressable>
              </View>
              {showBedtimePicker && <DateTimePicker value={bedtime} mode="time" display="spinner" onChange={(_, d) => { setShowBedtimePicker(false); if (d) setBedtime(d); }} />}
              {showWakeUpPicker && <DateTimePicker value={wakeUpTime} mode="time" display="spinner" onChange={(_, d) => { setShowWakeUpPicker(false); if (d) setWakeUpTime(d); }} />}
            </View>
            <SectionTitle title="HABITS" icon="cafe" />
            <View style={styles.row}>
              <Pressable style={[styles.pill, smoker && styles.pillActive]} onPress={() => setSmoker(!smoker)}><Text style={[styles.pillText, smoker && styles.pillTextActive]}>{smoker ? "SMOKER: YES" : "SMOKER: NO"}</Text></Pressable>
              {smoker && <MetricStepper label="Cigs / Day" value={cigs} onAdjust={(d) => setCigs(Math.max(1, cigs + d))} />}
            </View>
            <SectionTitle title="PREFERENCES" icon="restaurant" />
            <View style={styles.inputGroup}><TextInput style={styles.input} placeholder="Dishes..." placeholderTextColor="#666" value={dishes} onChangeText={setDishes} /></View>
            <Pressable style={[styles.saveBtn, { marginTop: 20 }]} onPress={handleSaveIntake} disabled={isSavingIntake}>
              {isSavingIntake ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>COMPLETE NUTRITION PROFILE</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <>
      <ScreenShell title="Nutrition" subtitle="Track your macros" contentStyle={styles.shellContent}>
        {isLoading ? <View style={styles.loader}><ActivityIndicator color={colors.primary} /></View> : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View>
                  <Typography variant="label" color="#8c8c8c">CALORIE INTAKE</Typography>
                  <Typography variant="metric" style={styles.largeMetric}>{totals.calories} <Typography style={styles.metricSub}>/ {targets.calories} kcal</Typography></Typography>
                </View>
                <NutritionRing current={totals.calories} target={targets.calories} />
              </View>
              <View style={styles.macrosRow}>
                <MacroItem label="Protein" current={totals.protein} target={targets.protein} color="#4ade80" icon="flash" />
                <MacroItem label="Carbs" current={totals.carbs} target={targets.carbs} color={colors.primary} icon="restaurant" />
                <MacroItem label="Fats" current={totals.fats} target={targets.fats} color="#f87171" icon="water" />
              </View>
            </View>

            {/* 2. WATER TRACKER */}
            <WaterTracker />


            {profile?.isPremium && prescribed.length > 0 && (
              <View style={styles.coachBanner}>
                <View style={styles.bannerHeader}><Ionicons name="sparkles" size={18} color={colors.primary} /><Text style={styles.bannerTitle}>NEW COACH PRESCRIPTION</Text></View>
                <Text style={styles.bannerSubtitle}>{prescribed[0].title}</Text>
                <View style={styles.bannerMacros}>
                  <MacroStat val={prescribed[0].macros.calories} label="KCALS" />
                  <MacroStat val={prescribed[0].macros.protein} label="PRO" />
                  <MacroStat val={prescribed[0].macros.carbs} label="CARBS" />
                </View>
                <Pressable style={styles.applyBtn} onPress={() => handleApplyCoachPlan(prescribed[0])} disabled={!!applyingPlanId}>
                  {applyingPlanId === prescribed[0].id ? <ActivityIndicator size="small" color="#000" /> : <><Text style={styles.applyBtnText}>APPLY TARGETS</Text><Ionicons name="checkmark-circle" size={18} color="#000" /></>}
                </Pressable>
              </View>
            )}

            <Pressable 
              style={styles.mainLogBtn} 
              onPress={() => setIsLogModalVisible(true)}
            >
              <View style={styles.mainLogBtnContent}>
                <View style={styles.logIconCircle}>
                  <Ionicons name="add" size={24} color="#000" />
                </View>
                <View>
                  <Typography variant="h2" style={{ fontSize: 18, marginBottom: 2 }}>Log a Meal</Typography>
                  <Typography variant="label" color="#444">Add entries to your daily diary</Typography>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#333" />
            </Pressable>

            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={18} color={colors.primary} />
                <Typography variant="h2" style={{ fontSize: 16 }}>Today's Log</Typography>
              </View>
              {meals.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="restaurant-outline" size={32} color="#1c1c1e" />
                  <Typography variant="label" color="#333" style={{ marginTop: 10 }}>No meals logged yet today</Typography>
                </View>
              ) : (
                meals.map((meal) => (
                  <Pressable key={meal.id} style={styles.mealItem} onLongPress={() => handleDeleteMeal(meal.id, meal.name)}>
                    {(meal as any).imageUrl ? (
                      <Image source={{ uri: (meal as any).imageUrl }} style={styles.mealThumb} />
                    ) : (
                      <View style={styles.mealIcon}><Ionicons name="fast-food" size={20} color={colors.primary} /></View>
                    )}
                    <View style={styles.mealInfo}><Text style={styles.mealName}>{meal.name}</Text><Text style={styles.mealMeta}>{meal.time}</Text></View>
                    <View style={styles.mealStats}><Text style={styles.mealCalories}>{meal.calories} kcal</Text><Text style={styles.mealProtein}>{meal.protein}g P</Text></View>
                  </Pressable>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </ScreenShell>

      <LogMealModal
        visible={isLogModalVisible}
        onClose={() => setIsLogModalVisible(false)}
        onSave={handleSaveMeal}
        isSaving={isSavingMeal}
      />
    </>
  );
}

function MacroStat({ val, label }: any) {
  return (<View style={styles.bannerMacroItem}><Text style={styles.macroValText}>{val}</Text><Text style={styles.macroLabelText}>{label}</Text></View>);
}

function MacroInput({ label, value, onChange, icon, color, unit }: any) {
  return (
    <View style={styles.macroInputCard}>
      <View style={styles.macroInputHeader}>
        <View style={[styles.macroIconBg, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={[styles.macroInputLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.macroValueRow}>
        <TextInput
          style={styles.macroInput}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#333"
        />
        <Text style={styles.macroUnitText}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: { paddingBottom: 0 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 120, gap: 20 },
  summaryCard: { backgroundColor: "#111", borderRadius: 28, padding: 24, borderWidth: 1, borderColor: "#1c1c1e", gap: 24, marginTop: 10 },
  summaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  largeMetric: { fontSize: 32, marginTop: 4 },
  metricSub: { fontSize: 18, color: '#444' },
  macrosRow: { flexDirection: "row", gap: 12 },
  logCard: { backgroundColor: "#111", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "#1c1c1e", gap: 16 },
  logCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: "#ffffff", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  row: { flexDirection: "row", gap: 12 },
  inputGroup: { gap: 8 },
  input: { backgroundColor: "#1c1c1e", borderRadius: 14, padding: 16, color: "#ffffff", fontSize: 14, fontWeight: "600", borderWidth: 1, borderColor: "#2c2c2e" },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 16, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  saveBtnDisabled: { opacity: 0.5, backgroundColor: "#333" },
  saveBtnText: { color: colors.primaryText, fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  photoRemoveBtn: { padding: 4 },
  headerInfo: { gap: 2 },
  photoActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  photoActionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mainMealInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    paddingVertical: 14,
  },
  mealInputSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#1c1c1e",
    gap: 12,
  },
  searchDbIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  imagePreviewContainer: {
    marginTop: 12,
    position: "relative",
  },
  fullPhotoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 20,
  },
  removePhotoBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 68, 68, 0.8)",
    padding: 6,
    borderRadius: 10,
  },
  macroFormGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  macroInputCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1c1c1e",
    gap: 10,
  },
  macroInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  macroIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  macroInputLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  macroValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  macroInput: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    padding: 0,
  },
  macroUnitText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#444",
  },
  mainLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#1c1c1e',
  },
  mainLogBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistory: {
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#111',
    borderStyle: 'dashed',
  },
  premiumAddBtn: {
    backgroundColor: colors.primary,
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  btnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: {
    opacity: 0.5,
    backgroundColor: "#222",
  },
  addBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  historySection: { gap: 12 },
  mealItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", padding: 16, borderRadius: 24, borderWidth: 1, borderColor: "#1c1c1e", gap: 12 },
  mealIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2c2c2e" },
  mealThumb: { width: 44, height: 44, borderRadius: 12 },
  mealInfo: { flex: 1, gap: 2 },
  mealName: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  mealMeta: { color: "#444", fontSize: 12, fontWeight: "500" },
  mealStats: { alignItems: "flex-end", gap: 2 },
  mealCalories: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  mealProtein: { color: "#4ade80", fontSize: 11, fontWeight: "700" },
  coachBanner: { backgroundColor: "#1c221a", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(164, 255, 33, 0.2)", gap: 12 },
  bannerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  bannerTitle: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  bannerSubtitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: -4 },
  bannerMacros: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 16, padding: 12, justifyContent: "space-between" },
  bannerMacroItem: { alignItems: "center", flex: 1 },
  macroValText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  macroLabelText: { color: colors.primary, fontSize: 9, fontWeight: "800", marginTop: 2 },
  applyBtn: { backgroundColor: colors.primary, height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  applyBtnText: { color: "#000", fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
  label: { color: "#8c8c8c", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  groupRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pill: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1c1c1e", alignItems: "center", borderWidth: 1, borderColor: "#2c2c2e" },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: "#8c8c8c", fontSize: 11, fontWeight: "900" },
  pillTextActive: { color: "#000" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 4 },
  sectionTitleText: { color: "#ffffff", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  timeText: { color: '#fff', fontSize: 13 },
  miniLabel: { color: '#444', fontSize: 9, fontWeight: '900' },
  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1e", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#2c2c2e" },
  stepperBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  stepperValueText: { flex: 1, textAlign: "center", color: "#fff", fontSize: 16, fontWeight: "800" },
  searchContainer: { marginBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderRadius: 16, paddingHorizontal: 16, height: 54, borderWidth: 1, borderColor: '#1c1c1e', gap: 12 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  searchResultsBox: { backgroundColor: '#111', borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: '#1c1c1e', overflow: 'hidden', elevation: 5 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1c1c1e', gap: 12 },
  searchResultThumb: { width: 36, height: 36, borderRadius: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { color: '#000', fontSize: 8, fontWeight: '900' },
  searchDbBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161616",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
    gap: 12,
    marginBottom: 16
  },
  searchDbText: { color: colors.primary, fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
});

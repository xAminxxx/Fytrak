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

export function NutritionScreen() {
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [prescribed, setPrescribed] = useState<PrescribedMeal[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applyingPlanId, setApplyingPlanId] = useState<string | null>(null);
  const [mealImageUri, setMealImageUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
    (acc, meal) => ({ calories: acc.calories + (meal.calories || 0), protein: acc.protein + (meal.protein || 0) }),
    { calories: 0, protein: 0 }
  ), [meals]);

  const handleSaveMeal = async () => {
    if (!mealName.trim() || !Number(calories)) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      let imageUrl: string | undefined;
      if (mealImageUri) {
        setIsUploadingImage(true);
        const result = await uploadMealPhoto(mealImageUri);
        imageUrl = result.secureUrl;
      }
      await saveMealLog(user.uid, {
        name: mealName.trim(),
        calories: Number(calories),
        protein: Number(protein) || 0,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...(imageUrl && { imageUrl }),
      });
      setMealName(""); setCalories(""); setProtein(""); setMealImageUri(null);
    } catch (error) { console.error(error); ToastService.error("Error", "Could not save meal log."); }
    finally { setIsUploadingImage(false); }
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
              <MacroItem label="Carbs" current={Math.round(totals.calories * 0.4 / 4)} target={targets.carbs} color={colors.primary} icon="restaurant" />
              <MacroItem label="Fats" current={Math.round(totals.calories * 0.25 / 9)} target={targets.fats} color="#f87171" icon="water" />
            </View>
          </View>

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

          <View style={styles.logCard}>
            <View style={styles.logCardHeader}>
              <Typography variant="h2">Quick Log</Typography>
              <View style={styles.photoRow}>
                <Pressable style={styles.photoPickBtn} onPress={async () => {
                  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                  if (!permissionResult.granted) {
                    ToastService.error("Permission Required", "Camera access is needed to take a meal photo.");
                    return;
                  }
                  const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.5
                  });
                  if (!result.canceled) setMealImageUri(result.assets[0].uri);
                }}>
                  {mealImageUri ? (
                    <Image source={{ uri: mealImageUri }} style={styles.photoPreview} />
                  ) : (
                    <><Ionicons name="camera-outline" size={16} color="#555" /><Text style={styles.photoPickText}>Photo</Text></>
                  )}
                </Pressable>
                {mealImageUri && (
                  <Pressable style={styles.photoRemoveBtn} onPress={() => setMealImageUri(null)}>
                    <Ionicons name="close-circle" size={18} color="#ff4444" />
                  </Pressable>
                )}
              </View>
            </View>
            <TextInput style={styles.input} placeholder="What did you eat?" placeholderTextColor="#8c8c8c" value={mealName} onChangeText={setMealName} />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Calories" placeholderTextColor="#8c8c8c" keyboardType="numeric" value={calories} onChangeText={setCalories} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Protein (g)" placeholderTextColor="#8c8c8c" keyboardType="numeric" value={protein} onChangeText={setProtein} />
            </View>
            <Pressable style={[styles.saveBtn, (!mealName.trim() || !Number(calories) || isUploadingImage) && styles.saveBtnDisabled]} onPress={handleSaveMeal} disabled={isUploadingImage}>
              {isUploadingImage ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.saveBtnText}>ADD TO LOG</Text>}
            </Pressable>
          </View>

          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Today's Log</Text>
            {meals.map((meal) => (
              <Pressable key={meal.id} style={styles.mealItem} onLongPress={() => handleDeleteMeal(meal.id, meal.name)}>
                {(meal as any).imageUrl ? (
                  <Image source={{ uri: (meal as any).imageUrl }} style={styles.mealThumb} />
                ) : (
                  <View style={styles.mealIcon}><Ionicons name="fast-food" size={20} color={colors.primary} /></View>
                )}
                <View style={styles.mealInfo}><Text style={styles.mealName}>{meal.name}</Text><Text style={styles.mealMeta}>{meal.time}</Text></View>
                <View style={styles.mealStats}><Text style={styles.mealCalories}>{meal.calories} kcal</Text><Text style={styles.mealProtein}>{meal.protein}g P</Text></View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

function MacroStat({ val, label }: any) {
  return (<View style={styles.bannerMacroItem}><Text style={styles.macroValText}>{val}</Text><Text style={styles.macroLabelText}>{label}</Text></View>);
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
  photoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  photoPickBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1c1c1e", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#2c2c2e" },
  photoPreview: { width: 32, height: 32, borderRadius: 8 },
  photoPickText: { color: "#555", fontSize: 11, fontWeight: "600" },
  photoRemoveBtn: { padding: 4 },
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
});

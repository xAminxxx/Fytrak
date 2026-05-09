import React, { useMemo, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  Modal,
  useWindowDimensions,
  FlatList
} from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../components/Typography";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { saveBodyMetric, type ProgressPhoto } from "../../services/userSession";
import { EXERCISE_LIBRARY, t as tEx } from "../../constants/exercises";
import { ProgressCamera } from "../../components/ProgressCamera";
import { CompareSlider } from "../../components/CompareSlider";
import { TrendChart } from "../../components/TrendChart";
import { ChartFilterBar } from "../../components/ChartFilterBar";
import { useNavigation } from "@react-navigation/native";
import { ConsistencyCalendar } from "../../components/ConsistencyCalendar";
import type { ChartFilter } from "../../utils/chartFilters";

// Clean Components extracted for modularity
import { MetricCard } from "../../components/MetricCard";
import { PhotoGridItem } from "../../components/PhotoGridItem";
import { BFRow } from "../../components/BFRow";

// Extracted hooks — business logic lives here, not in the screen
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useBodyMetrics } from "../../hooks/useBodyMetrics";
import { useProgressPhotos } from "../../hooks/useProgressPhotos";
import { useDailyNutrition } from "../../hooks/useDailyNutrition";
import { useProgressCharts } from "../../hooks/useProgressCharts";

const GAP = 8;

export function ProgressScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const uid = useCurrentUser();

  // Data subscriptions — powered by extracted hooks
  const workouts = useWorkouts();
  const { profile: userProfile } = useUserProfile();
  const { metrics, isLoading } = useBodyMetrics();
  const { photos, isSaving: isPhotoSaving, handleCapture, handlePickPhoto } = useProgressPhotos();
  const meals = useDailyNutrition();

  // Chart state
  const [chartFilter, setChartFilter] = useState<ChartFilter>("1M");
  const [selectedPrId, setSelectedPrId] = useState<string>("e1");

  // All chart computations — extracted to useProgressCharts hook
  const {
    weightChartData, volumeChartData, muscleDistributionData, prChartData,
    calculateBMI, weeklyConsistency, totalVolumeLifted, macroAdherence,
  } = useProgressCharts(workouts, metrics, meals, userProfile, chartFilter, selectedPrId);

  // UI-only local state
  const [newWeight, setNewWeight] = useState("");
  const [newBodyFat, setNewBodyFat] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [compareSelection, setCompareSelection] = useState<ProgressPhoto[]>([]);
  const [isBFModalVisible, setIsBFModalVisible] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [activeComparePair, setActiveComparePair] = useState<[ProgressPhoto, ProgressPhoto] | null>(null);

  const itemWidth = useMemo(() => (windowWidth - 40 - (GAP * 2)) / 3, [windowWidth]);

  // Handlers — only UI-specific logic remains here
  const handleCameraCapture = async (uri: string) => {
    setIsCameraVisible(false);
    await handleCapture(uri);
  };

  const toggleSelection = useCallback((p: ProgressPhoto) => {
    if (isCompareMode) {
      setCompareSelection(prev => {
        const isAlreadySelected = prev.find(x => x.id === p.id);
        if (isAlreadySelected) return prev.filter(x => x.id !== p.id);
        if (prev.length >= 2) {
          Alert.alert("Limit Reached", "Select only 2 photos to compare.");
          return prev;
        }
        return [...prev, p];
      });
      return;
    }
    setSelection(prev => {
      const next = prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id];
      if (next.length === 0) setIsSelectionMode(false);
      return next;
    });
  }, [isCompareMode]);

  const handleLongPress = useCallback((p: ProgressPhoto) => {
    if (!isSelectionMode && !isCompareMode) {
      setIsSelectionMode(true);
      setSelection([p.id]);
    }
  }, [isSelectionMode, isCompareMode]);

  const handleLogMetric = async () => {
    if (!newWeight || isNaN(Number(newWeight))) {
      Alert.alert("Invalid", "Please enter weight.");
      return;
    }
    if (!uid) return;
    try {
      setIsSaving(true);
      await saveBodyMetric(uid, { weight: Number(newWeight), bodyFat: newBodyFat ? Number(newBodyFat) : undefined });
      setNewWeight(""); setNewBodyFat("");
    } catch (error) { console.error(error); } finally { setIsSaving(false); }
  };

  const handleDeleteSelected = async () => {
    if (!uid || selection.length === 0) return;
    Alert.alert("Delete Photos", `Delete ${selection.length} photos?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSaving(true);
            const { deleteProgressPhoto } = await import("../../services/userSession");
            for (const id of selection) await deleteProgressPhoto(uid, id);
            setSelection([]); setIsSelectionMode(false);
          } catch (error) { console.error(error); } finally { setIsSaving(false); }
        }
      }
    ]);
  };

  const startComparison = () => {
    if (compareSelection.length !== 2) return;
    const sorted = [...compareSelection].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setActiveComparePair([sorted[0], sorted[1]]);
  };

  return (
    <ScreenShell title="Progress" subtitle="Consistency Tracking" contentStyle={styles.shellContent}>
      {isLoading ? <View style={styles.loader}><ActivityIndicator color={colors.primary} /></View> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* OVERLAYS & MODALS */}
          <Modal visible={!!activeComparePair} transparent={false} animationType="slide">
            {activeComparePair && (
              <CompareSlider
                beforeUri={activeComparePair[0].url}
                afterUri={activeComparePair[1].url}
                beforeDate={`${new Date(activeComparePair[0].date).toLocaleDateString()} (Before)`}
                afterDate={`${new Date(activeComparePair[1].date).toLocaleDateString()} (After - ${Math.round((new Date(activeComparePair[1].date).getTime() - new Date(activeComparePair[0].date).getTime()) / (1000 * 60 * 60 * 24))} Days Split)`}
                onClose={() => setActiveComparePair(null)}
              />
            )}
          </Modal>

          <Modal visible={isCameraVisible} transparent={false} animationType="slide">
            <ProgressCamera
              onClose={() => setIsCameraVisible(false)}
              onCapture={handleCameraCapture}
              overlayUri={photos.length > 0 ? photos[0].url : undefined}
            />
          </Modal>

          <Modal visible={!!selectedPhoto} transparent={true} animationType="fade">
            <View style={styles.viewerOverlay}>
              <Pressable style={styles.viewerClose} onPress={() => setSelectedPhoto(null)}>
                <Ionicons name="close" size={32} color="#fff" />
              </Pressable>
              {selectedPhoto && <View style={styles.viewerContent}><Image source={{ uri: selectedPhoto }} style={styles.viewerImage} resizeMode="contain" /></View>}
            </View>
          </Modal>

          {/* GALLERY MODAL */}
          <Modal visible={isGalleryVisible} transparent={false} animationType="slide">
            <ScreenShell
              title={isCompareMode ? "SELECT 2 PHOTOS" : isSelectionMode ? `${selection.length} SELECTED` : "GALLERY"}
              subtitle={isCompareMode ? "Pick two snapshots to compare" : isSelectionMode ? "Tap to select more" : "Tap photo to open, hold to delete"}
              leftActionIcon="close"
              onLeftAction={() => {
                setIsGalleryVisible(false);
                setIsSelectionMode(false);
                setIsCompareMode(false);
                setSelection([]);
                setCompareSelection([]);
              }}
              rightActionIcon={isCompareMode ? "swap-horizontal" : isSelectionMode ? "trash" : "git-compare-outline"}
              onRightAction={isCompareMode ? (compareSelection.length === 2 ? startComparison : undefined) : isSelectionMode ? handleDeleteSelected : () => setIsCompareMode(true)}
            >
              <FlatList
                data={photos}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.galleryScroll}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                initialNumToRender={12}
                extraData={[selection, compareSelection, isCompareMode]}
                renderItem={({ item }: { item: ProgressPhoto }) => (
                  <PhotoGridItem
                    photo={item}
                    isSelected={selection.includes(item.id)}
                    isSelectionMode={isSelectionMode}
                    isCompareMode={isCompareMode}
                    isCompareSelected={compareSelection.some(x => x.id === item.id)}
                    onSelect={toggleSelection}
                    onView={setSelectedPhoto}
                    onLongPress={handleLongPress}
                    width={itemWidth}
                  />
                )}
              />
              {isCompareMode && compareSelection.length === 2 && (
                <Pressable style={styles.floatingCompareBtn} onPress={startComparison}>
                  <Ionicons name="swap-horizontal" size={24} color="#000" />
                  <Text style={styles.floatingCompareText}>COMPARE NOW</Text>
                </Pressable>
              )}
            </ScreenShell>
          </Modal>

          {/* BODY FAT ESTIMATOR */}
          <Modal visible={isBFModalVisible} transparent={true} animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.estimateBox}>
                <View style={styles.modalHeader}>
                  <Text style={styles.cardTitle}>Estimate Body Fat</Text>
                  <Pressable onPress={() => setIsBFModalVisible(false)}><Ionicons name="close" size={24} color="#8c8c8c" /></Pressable>
                </View>
                <Text style={styles.modalDesc}>Most people can't measure BF exactly. Select the category that best describes your look:</Text>
                <ScrollView style={{ maxHeight: 400 }}>
                  <BFRow label="Athletic" male="6-13%" female="14-20%" desc="Abs are very visible, muscle definition is sharp." onSelect={() => { setNewBodyFat("10"); setIsBFModalVisible(false); }} />
                  <BFRow label="Fit" male="14-17%" female="21-24%" desc="Abs are faint or visible in right light. Athletic look." onSelect={() => { setNewBodyFat("15"); setIsBFModalVisible(false); }} />
                  <BFRow label="Acceptable" male="18-24%" female="25-31%" desc="Flat stomach but no abs. Healthy look." onSelect={() => { setNewBodyFat("20"); setIsBFModalVisible(false); }} />
                  <BFRow label="High" male="25%+" female="32%+" desc="Soft look, no muscle definition visible." onSelect={() => { setNewBodyFat("30"); setIsBFModalVisible(false); }} />
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* DASHBOARD CONTENT */}
          {/* 1. CONSISTENCY CALENDAR */}
          <ConsistencyCalendar workouts={workouts} />

          <View style={styles.grid}>
             <MetricCard icon="calendar" label="Weekly Flow" value={weeklyConsistency} unit="Days" color="#60a5fa" />
             <MetricCard icon="flash" label="Daily Fuel" value={macroAdherence} unit="%" color={colors.primary} />
             <MetricCard icon="barbell" label="Total Volume" value={totalVolumeLifted > 1000 ? `${(totalVolumeLifted/1000).toFixed(1)}k` : totalVolumeLifted} unit="kg" color="#f87171" />
             <MetricCard icon="body" label="BMI Index" value={calculateBMI} unit="" color="#4ade80" />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Typography variant="h2">Log Today's Entry</Typography>
              <Pressable onPress={() => setIsBFModalVisible(true)} hitSlop={10}>
                <Typography variant="label" color={colors.primary} style={styles.helpLink}>Estimate BF%</Typography>
              </Pressable>
            </View>
            <View style={styles.metricInputRow}>
              <View style={styles.stepperContainer}>
                <Typography variant="label" color="#8c8c8c" style={styles.inputLabel}>Weight (kg)</Typography>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => setNewWeight(prev => (Math.max(0, (Number(prev) || Number(metrics[0]?.weight) || 70) - 0.5)).toString())}>
                    <Ionicons name="remove" size={18} color="#fff" />
                  </Pressable>
                  <TextInput
                    style={styles.stepInput}
                    keyboardType="decimal-pad"
                    value={newWeight}
                    onChangeText={setNewWeight}
                    placeholder={metrics[0]?.weight?.toString() || "0.0"}
                    placeholderTextColor="#444"
                  />
                  <Pressable style={styles.stepBtn} onPress={() => setNewWeight(prev => ((Number(prev) || Number(metrics[0]?.weight) || 70) + 0.5).toString())}>
                    <Ionicons name="add" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>
              <Pressable style={[styles.mainSaveBtn, isSaving && { opacity: 0.6 }]} onPress={handleLogMetric} disabled={isSaving}>
                <Ionicons name="checkmark" size={24} color={colors.primaryText} />
              </Pressable>
            </View>

            <View style={styles.secondaryInputRow}>
              <Typography variant="label" color="#444">BODY FAT UPDATE (OPTIONAL)</Typography>
              <View style={styles.smallStepper}>
                <Pressable onPress={() => setNewBodyFat(prev => (Math.max(0, (Number(prev) || 15) - 0.5)).toString())}>
                  <Ionicons name="remove-circle-outline" size={20} color="#666" />
                </Pressable>
                <TextInput
                  style={styles.smallStepInput}
                  keyboardType="decimal-pad"
                  value={newBodyFat}
                  onChangeText={setNewBodyFat}
                  placeholder="0.0%"
                  placeholderTextColor="#333"
                />
                <Pressable onPress={() => setNewBodyFat(prev => ((Number(prev) || 15) + 0.5).toString())}>
                  <Ionicons name="add-circle-outline" size={20} color="#666" />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Typography variant="h2">Transformation Vault</Typography>
              {userProfile?.isPremium ? (
                <View style={styles.headerActions}>
                  <Pressable style={styles.smallActionBtn} onPress={() => setIsGalleryVisible(true)}><Ionicons name="images-outline" size={18} color={colors.primary} /></Pressable>
                  <Pressable style={styles.addBtn} onPress={handlePickPhoto}><Ionicons name="camera" size={20} color={colors.primaryText} /></Pressable>
                </View>
              ) : (
                <View style={styles.premiumPill}>
                  <Ionicons name="lock-closed" size={12} color={colors.primary} />
                  <Text style={styles.premiumPillText}>PREMIUM</Text>
                </View>
              )}
            </View>
            {userProfile?.isPremium ? (
              <Pressable style={styles.photoWidget} onPress={() => setIsGalleryVisible(true)}>
                {photos.length === 0 ? <View style={styles.widgetEmpty}><Text style={styles.widgetEmptyText}>Tap to add snapshots</Text></View> : (
                  <View style={styles.widgetGird}>
                    <View style={[styles.widgetMain, photos.length === 1 && { flex: 1 }]}><Image source={{ uri: photos[0].url }} style={styles.widgetMainImg} /></View>
                    {photos.length > 1 && (
                      <View style={[styles.widgetSide, photos.length === 2 && { flex: 1 }]}>
                        {photos.slice(1, 3).map((p, idx) => <Image key={p.id} source={{ uri: p.url }} style={[styles.widgetSideImg, idx > 0 && { marginTop: 4 }]} />)}
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            ) : (
              <Pressable style={styles.vaultLocked} onPress={() => navigation.navigate("CoachAssignment")}>
                <View style={styles.vaultLockedIcon}>
                  <Ionicons name="images" size={28} color="#333" />
                </View>
                <Text style={styles.vaultLockedTitle}>Track your transformation</Text>
                <Text style={styles.vaultLockedDesc}>Get a coach to unlock progress photos, before/after comparisons, and body composition tracking.</Text>
                <View style={styles.vaultLockedCta}>
                  <Ionicons name="sparkles" size={14} color="#000" />
                  <Text style={styles.vaultLockedCtaText}>UNLOCK WITH COACH</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* 5. TREND ANALYSIS */}
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <View style={styles.trendTitleRow}>
                 <View style={styles.accentBar} />
                 <Typography variant="h2" style={{ fontSize: 18 }}>Weight Trend</Typography>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Typography variant="metric" style={{ fontSize: 22 }}>{metrics[0]?.weight || '--'} <Typography variant="label" color="#444">kg</Typography></Typography>
                <Typography variant="label" color="#4ade80" style={{ fontSize: 9 }}>Tracking active</Typography>
              </View>
            </View>

            <TrendChart
              data={weightChartData.data}
              color={colors.primary}
              yAxisOffset={weightChartData.yAxisOffset}
              emptyLabel="Insufficient tracking data"
            />

            <ChartFilterBar value={chartFilter} onChange={setChartFilter} />
          </View>

          {/* 6. VOLUME ANALYSIS */}
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <View style={styles.trendTitleRow}>
                 <View style={[styles.accentBar, { backgroundColor: "#f87171" }]} />
                 <Typography variant="h2" style={{ fontSize: 18 }}>Volume Progression</Typography>
              </View>
            </View>

            <TrendChart
              data={volumeChartData.data}
              color="#f87171"
              emptyLabel="No volume data in this period"
            />

            <ChartFilterBar value={chartFilter} onChange={setChartFilter} />
          </View>
          {/* 7. MUSCLE DISTRIBUTION */}
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <View style={styles.trendTitleRow}>
                 <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
                 <Typography variant="h2" style={{ fontSize: 18 }}>Muscle Focus</Typography>
              </View>
              <Typography variant="label" color="#444">Total Sets Map</Typography>
            </View>

            <View style={[styles.chartBox, { paddingLeft: 10 }]}>
              {muscleDistributionData.some(d => d.value > 0) ? (
                <BarChart
                  data={muscleDistributionData}
                  barWidth={32}
                  noOfSections={3}
                  barBorderRadius={8}
                  frontColor={colors.primary}
                  yAxisThickness={0}
                  xAxisThickness={0}
                  hideRules
                  height={150}
                  width={windowWidth - 100}
                  spacing={12}
                  isAnimated
                  animationDuration={800}
                  yAxisTextStyle={{ color: '#444', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#666', fontSize: 9, fontWeight: '700' }}
                />
              ) : (
                <View style={styles.chartEmpty}>
                  <Typography variant="label" color="#444">Log workouts to see your focus map</Typography>
                </View>
              )}
            </View>
            <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
               {muscleDistributionData.filter(d => d.value > 0).map((m, i) => (
                 <View key={i} style={[styles.tag, { backgroundColor: m.frontColor + '20', borderColor: m.frontColor + '40', borderWidth: 1 }]}>
                    <Text style={[styles.tagText, { color: m.frontColor }]}>{m.label}: {m.value}</Text>
                 </View>
               ))}
            </View>
          </View>
          {/* 8. PR STRENGTH TRACKER */}
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <View style={styles.trendTitleRow}>
                 <View style={[styles.accentBar, { backgroundColor: "#a855f7" }]} />
                 <Typography variant="h2" style={{ fontSize: 18 }}>PR Strength (1RM)</Typography>
              </View>
            </View>
            
            <View style={styles.prSelector}>
               {EXERCISE_LIBRARY.filter(ex => ex.mechanicsType === "Compound").slice(0, 4).map(ex => (
                 <Pressable 
                   key={ex.id} 
                   onPress={() => setSelectedPrId(ex.id)}
                   style={[styles.prOption, selectedPrId === ex.id && styles.prOptionActive]}
                 >
                    <Text style={[styles.prOptionText, selectedPrId === ex.id && styles.prOptionTextActive]}>{tEx(ex.name)}</Text>
                 </Pressable>
               ))}
            </View>

            <View style={[styles.chartBox, { paddingLeft: 10, marginTop: 10 }]}>
              {prChartData.data.length > 0 ? (
                <LineChart
                  data={prChartData.data}
                  height={150}
                  width={windowWidth - 100}
                  color="#a855f7"
                  thickness={3}
                  yAxisOffset={prChartData.yAxisOffset}
                  noOfSections={3}
                  yAxisTextStyle={{ color: '#555', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#555', fontSize: 9 }}
                  hideRules
                  showVerticalLines
                  verticalLinesColor="#1a1a1a"
                  dataPointsColor="#a855f7"
                  curved
                />
              ) : (
                <View style={styles.chartEmpty}>
                  <Typography variant="label" color="#444">No sets logged for this exercise</Typography>
                </View>
              )}
            </View>
            <View style={styles.prFooter}>
               <Ionicons name="bulb-outline" size={14} color="#a855f7" />
               <Text style={styles.prFooterText}>Calculated using Brzycki estimated 1RM formula.</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shellContent: { paddingBottom: 0 },
  loader: { padding: 100, alignItems: "center" },
  scroll: { paddingBottom: 120, gap: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10, paddingHorizontal: 4 },
  tag: { backgroundColor: "#2c2c2e", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagText: { color: "#aaa", fontSize: 10, fontWeight: "900" },
  card: { backgroundColor: "#111", borderRadius: 32, padding: 24, borderWidth: 1, borderColor: "#1c1c1e", gap: 16 },
  headerActions: { flexDirection: "row", gap: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  metricInputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", marginTop: 4 },
  stepperContainer: { flex: 1, gap: 6 },
  stepper: { flexDirection: "row", backgroundColor: "#1c1c1e", borderRadius: 14, borderWidth: 1, borderColor: "#2c2c2e", height: 50, alignItems: "center", overflow: "hidden" },
  stepBtn: { width: 40, height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#2c2c2e50" },
  stepInput: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "800", textAlign: "center", padding: 0 },
  mainSaveBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  inputLabel: { marginLeft: 4, marginBottom: 4 },
  helpLink: { textDecorationLine: 'underline' },
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  secondaryInputRow: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#1c1c1e', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallStepper: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#000', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  smallStepInput: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center', width: 40 },
  smallActionBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2c2c2e" },
  photoWidget: { height: 160, borderRadius: 20, overflow: "hidden", backgroundColor: "#1c1c1e", borderWidth: 1, borderColor: "#2c2c2e" },
  widgetEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  widgetEmptyText: { color: "#444", fontSize: 13, fontWeight: "600" },
  widgetGird: { flex: 1, flexDirection: "row" },
  widgetMain: { flex: 2 },
  widgetMainImg: { width: "100%", height: "100%" },
  widgetSide: { flex: 1, paddingLeft: 4 },
  widgetSideImg: { flex: 1, width: "100%" },
  galleryScroll: { paddingHorizontal: 0, paddingTop: 16, paddingBottom: 100 },
  columnWrapper: { justifyContent: "space-between", marginBottom: GAP },
  viewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  viewerClose: { position: "absolute", top: 60, right: 30, zIndex: 10 },
  viewerContent: { width: "100%", height: "80%" },
  viewerImage: { width: "100%", height: "100%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 20 },
  estimateBox: { backgroundColor: "#161616", borderRadius: 28, padding: 20, width: "100%", borderWidth: 1, borderColor: "#2c2c2e", gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalDesc: { color: "#8c8c8c", fontSize: 13, fontWeight: "500", lineHeight: 18 },
  trendCard: { backgroundColor: '#101010', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#1c1c1e', marginBottom: 20, overflow: 'hidden' },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  trendTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accentBar: { width: 4, height: 18, backgroundColor: colors.primary, borderRadius: 2 },
  chartBox: { marginTop: 4, marginLeft: -10, alignItems: 'center' },
  chartEmpty: { height: 200, justifyContent: 'center', alignItems: 'center' },
  premiumPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#161616', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#1c1c1e' },
  premiumPillText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  vaultLocked: { height: 160, borderRadius: 20, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 8 },
  vaultLockedIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#161616', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1c1c1e' },
  vaultLockedTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  vaultLockedDesc: { color: '#555', fontSize: 11, fontWeight: '500', textAlign: 'center', lineHeight: 16 },
  vaultLockedCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 4 },
  vaultLockedCtaText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  prSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  prOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#111', borderWidth: 1, borderColor: '#1c1c1e' },
  prOptionActive: { backgroundColor: '#a855f7' },
  prOptionText: { color: '#666', fontSize: 11, fontWeight: '800' },
  prOptionTextActive: { color: '#000' },
  prFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 12 },
  prFooterText: { color: '#444', fontSize: 10, fontWeight: '600' },
  floatingCompareBtn: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  floatingCompareText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
});

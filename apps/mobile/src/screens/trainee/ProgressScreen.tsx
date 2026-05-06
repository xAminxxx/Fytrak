import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import { auth } from "../../config/firebase";
import * as ImagePicker from "expo-image-picker";
import { LineChart } from "react-native-gifted-charts";
import {
  subscribeToWorkouts,
  subscribeToLatestMetrics,
  saveBodyMetric,
  subscribeToProgressPhotos,
  saveProgressPhoto,
  deleteProgressPhoto,
  subscribeToUserProfile,
  subscribeToDailyMeals,
  type WorkoutLog,
  type BodyMetric,
  type ProgressPhoto,
  type UserProfile,
  type Meal
} from "../../services/userSession";
import { uploadProgressPhoto } from "../../services/cloudinaryUpload";
import { ProgressCamera } from "../../components/ProgressCamera";
import { CompareSlider } from "../../components/CompareSlider";
import { useNavigation } from "@react-navigation/native";

// Clean Components extracted for modularity
import { MetricCard } from "../../components/MetricCard";
import { PhotoGridItem } from "../../components/PhotoGridItem";
import { BFRow } from "../../components/BFRow";

const GAP = 8;

export function ProgressScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // States
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
  const [chartFilter, setChartFilter] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');

  // Computed Values
  const calculateBMI = useMemo(() => {
    if (!metrics[0]?.weight || !userProfile?.height) return "--";
    const heightInM = userProfile.height / 100;
    return (metrics[0].weight / (heightInM * heightInM)).toFixed(1);
  }, [metrics, userProfile]);

  const weeklyConsistency = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return workouts.filter(w => {
      if (!w.createdAt) return false;
      const d = w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt);
      return d >= startOfWeek;
    }).length;
  }, [workouts]);

  const totalVolumeLifted = useMemo(() => {
    return workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  }, [workouts]);

  const weightChartData = useMemo(() => {
    if (!metrics.length) return { data: [], yAxisOffset: 0 };
    const now = new Date();
    let cutoff = new Date(0); // ALL
    if (chartFilter === '1W') { const d = new Date(); d.setDate(d.getDate() - 7); cutoff = d; }
    else if (chartFilter === '1M') { const d = new Date(); d.setMonth(d.getMonth() - 1); cutoff = d; }
    else if (chartFilter === '3M') { const d = new Date(); d.setMonth(d.getMonth() - 3); cutoff = d; }
    else if (chartFilter === '1Y') { const d = new Date(); d.setFullYear(d.getFullYear() - 1); cutoff = d; }

    const filtered = [...metrics].filter(m => new Date(m.createdAt?.toDate ? m.createdAt.toDate() : m.date) >= cutoff).reverse();
    if (filtered.length === 0) return { data: [], yAxisOffset: 0 };

    const weights = filtered.map(m => m.weight);
    const minW = Math.min(...weights);
    const yAxisOffset = Math.floor(minW - 2);

    return {
      yAxisOffset,
      data: filtered.map(m => ({
        value: m.weight,
        label: new Date(m.date).toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
        dataPointText: m.weight.toFixed(1),
        dataPointColor: colors.primary,
        dataPointRadius: 5,
        textColor: '#aaa',
        textFontSize: 10,
        textShiftY: -14,
      }))
    };
  }, [metrics, chartFilter]);

  const volumeChartData = useMemo(() => {
    if (!workouts.length) return { data: [] };
    let cutoff = new Date(0);
    if (chartFilter === '1W') { const d = new Date(); d.setDate(d.getDate() - 7); cutoff = d; }
    else if (chartFilter === '1M') { const d = new Date(); d.setMonth(d.getMonth() - 1); cutoff = d; }
    else if (chartFilter === '3M') { const d = new Date(); d.setMonth(d.getMonth() - 3); cutoff = d; }
    else if (chartFilter === '1Y') { const d = new Date(); d.setFullYear(d.getFullYear() - 1); cutoff = d; }

    const filtered = [...workouts]
      .filter(w => w.createdAt && new Date(w.createdAt.toDate ? w.createdAt.toDate() : w.createdAt) >= cutoff)
      .sort((a, b) => new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt).getTime() - new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt).getTime());

    if (filtered.length === 0) return { data: [] };

    return {
      data: filtered.map(w => ({
        value: w.totalVolume || 0,
        label: new Date(w.createdAt?.toDate ? w.createdAt.toDate() : w.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
        dataPointText: (w.totalVolume || 0).toString(),
        dataPointColor: "#f87171",
        dataPointRadius: 5,
        textColor: '#aaa',
        textFontSize: 10,
        textShiftY: -14,
      }))
    };
  }, [workouts, chartFilter]);

  const itemWidth = useMemo(() => (windowWidth - 40 - (GAP * 2)) / 3, [windowWidth]);

  const macroAdherence = useMemo(() => {
    const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const targetCals = userProfile?.macroTargets?.calories || 2000;
    if (totalCals === 0) return 0;
    return Math.min(Math.round((totalCals / targetCals) * 100), 100);
  }, [meals, userProfile]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubWorkouts = subscribeToWorkouts(user.uid, setWorkouts);
    const unsubMetrics = subscribeToLatestMetrics(user.uid, (data) => {
      setMetrics(data);
      setIsLoading(false);
    });
    const unsubPhotos = subscribeToProgressPhotos(user.uid, setPhotos);
    const unsubProfile = subscribeToUserProfile(user.uid, setUserProfile);
    const unsubMeals = subscribeToDailyMeals(user.uid, setMeals);

    return () => {
      unsubWorkouts();
      unsubMetrics();
      unsubPhotos();
      unsubProfile();
      unsubMeals();
    };
  }, []);

  // Handlers
  const handleCapture = async (uri: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setIsCameraVisible(false);
      setIsSaving(true);
      const result = await uploadProgressPhoto(uri);
      await saveProgressPhoto(user.uid, {
        url: result.secureUrl,
        date: new Date().toISOString().split("T")[0],
        type: "front"
      });
      Alert.alert("Success", "Transformation photo saved!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to upload photo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickPhotoFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8
    });
    if (!result.canceled && result.assets[0].uri) {
      handleCapture(result.assets[0].uri);
    }
  };

  const handlePickPhoto = () => {
    Alert.alert("Track Progress", "Select capture mode", [
      { text: "Camera (Ghost Overlay)", onPress: () => setIsCameraVisible(true) },
      { text: "Import from Gallery", onPress: handlePickPhotoFromLibrary },
      { text: "Cancel", style: "cancel" }
    ]);
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
    const user = auth.currentUser;
    if (!user) return;
    try {
      setIsSaving(true);
      await saveBodyMetric(user.uid, { weight: Number(newWeight), bodyFat: newBodyFat ? Number(newBodyFat) : undefined });
      setNewWeight(""); setNewBodyFat("");
    } catch (error) { console.error(error); } finally { setIsSaving(false); }
  };

  const handleDeleteSelected = async () => {
    const user = auth.currentUser;
    if (!user || selection.length === 0) return;
    Alert.alert("Delete Photos", `Delete ${selection.length} photos?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSaving(true);
            for (const id of selection) await deleteProgressPhoto(user.uid, id);
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
              onCapture={handleCapture}
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

            <View style={styles.chartBox}>
              {weightChartData.data.length > 0 ? (
                <LineChart
                  areaChart
                  data={weightChartData.data}
                  curved
                  height={200}
                  width={windowWidth - 90}
                  initialSpacing={15}
                  endSpacing={20}
                  spacing={weightChartData.data.length <= 3 ? 80 : weightChartData.data.length <= 7 ? 50 : 35}
                  color={colors.primary}
                  thickness={3}
                  startFillColor="rgba(255, 204, 0, 0.25)"
                  endFillColor="rgba(255, 204, 0, 0.02)"
                  startOpacity={0.5}
                  endOpacity={0.05}
                  yAxisOffset={weightChartData.yAxisOffset}
                  noOfSections={4}
                  rulesType="dashed"
                  rulesColor="#1c1c1e"
                  dashWidth={4}
                  dashGap={6}
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: '#555', fontSize: 10, fontWeight: '600' }}
                  yAxisTextNumberOfLines={1}
                  xAxisLabelTextStyle={{ color: '#555', fontSize: 9, fontWeight: '500' }}
                  showVerticalLines
                  verticalLinesColor="#1a1a1a"
                  verticalLinesThickness={1}
                  hideDataPoints={false}
                  dataPointsColor={colors.primary}
                  dataPointsRadius={5}
                  focusEnabled
                  showStripOnFocus
                  stripColor="rgba(255,204,0,0.15)"
                  stripWidth={2}
                  showTextOnFocus
                  unFocusOnPressOut
                  focusedDataPointColor="#fff"
                  focusedDataPointRadius={7}
                  textColor="#aaa"
                  textFontSize={10}
                  textShiftY={-14}
                  pointerConfig={{
                    pointerStripColor: 'rgba(255,204,0,0.4)',
                    pointerStripWidth: 1,
                    pointerColor: '#fff',
                    radius: 7,
                    pointerLabelWidth: 80,
                    pointerLabelHeight: 32,
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelComponent: (items: any) => (
                      <View style={styles.pointerBadge}>
                        <Text style={styles.pointerText}>{items[0].value} kg</Text>
                      </View>
                    ),
                  }}
                />
              ) : (
                <View style={styles.chartEmpty}>
                  <Typography variant="label" color="#444">Insufficient tracking data</Typography>
                </View>
              )}
            </View>

            <View style={styles.filterContainer}>
              {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map(f => (
                <Pressable
                  key={f}
                  onPress={() => setChartFilter(f)}
                  style={[styles.filterBtn, chartFilter === f && styles.filterBtnActive]}
                >
                   <Typography style={[styles.filterText, chartFilter === f && styles.filterTextActive]}>{f.toUpperCase()}</Typography>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 6. VOLUME ANALYSIS */}
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <View style={styles.trendTitleRow}>
                 <View style={[styles.accentBar, { backgroundColor: "#f87171" }]} />
                 <Typography variant="h2" style={{ fontSize: 18 }}>Volume Progression</Typography>
              </View>
            </View>

            <View style={styles.chartBox}>
              {volumeChartData.data.length > 0 ? (
                <LineChart
                  areaChart
                  data={volumeChartData.data}
                  curved
                  height={200}
                  width={windowWidth - 90}
                  initialSpacing={15}
                  endSpacing={20}
                  spacing={volumeChartData.data.length <= 3 ? 80 : volumeChartData.data.length <= 7 ? 50 : 35}
                  color="#f87171"
                  thickness={3}
                  startFillColor="rgba(248, 113, 113, 0.25)"
                  endFillColor="rgba(248, 113, 113, 0.02)"
                  startOpacity={0.5}
                  endOpacity={0.05}
                  yAxisOffset={0}
                  noOfSections={4}
                  rulesType="dashed"
                  rulesColor="#1c1c1e"
                  dashWidth={4}
                  dashGap={6}
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: '#555', fontSize: 10, fontWeight: '600' }}
                  yAxisTextNumberOfLines={1}
                  xAxisLabelTextStyle={{ color: '#555', fontSize: 9, fontWeight: '500' }}
                  showVerticalLines
                  verticalLinesColor="#1a1a1a"
                  verticalLinesThickness={1}
                  hideDataPoints={false}
                  dataPointsColor="#f87171"
                  dataPointsRadius={5}
                  focusEnabled
                  showStripOnFocus
                  stripColor="rgba(248, 113, 113, 0.15)"
                  stripWidth={2}
                  showTextOnFocus
                  unFocusOnPressOut
                  focusedDataPointColor="#fff"
                  focusedDataPointRadius={7}
                  textColor="#aaa"
                  textFontSize={10}
                  textShiftY={-14}
                  pointerConfig={{
                    pointerStripColor: 'rgba(248, 113, 113, 0.4)',
                    pointerStripWidth: 1,
                    pointerColor: '#fff',
                    radius: 7,
                    pointerLabelWidth: 80,
                    pointerLabelHeight: 32,
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelComponent: (items: any) => (
                      <View style={styles.pointerBadge}>
                        <Text style={styles.pointerText}>{items[0].value} kg</Text>
                      </View>
                    ),
                  }}
                />
              ) : (
                <View style={styles.chartEmpty}>
                  <Typography variant="label" color="#444">No volume data in this period</Typography>
                </View>
              )}
            </View>

            <View style={styles.filterContainer}>
              {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map(f => (
                <Pressable
                  key={f}
                  onPress={() => setChartFilter(f)}
                  style={[styles.filterBtn, chartFilter === f && styles.filterBtnActive]}
                >
                   <Typography style={[styles.filterText, chartFilter === f && styles.filterTextActive]}>{f.toUpperCase()}</Typography>
                </Pressable>
              ))}
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
  pointerBadge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginBottom: 8, alignSelf: 'center' },
  pointerText: { color: '#000', fontWeight: '900', fontSize: 12 },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, backgroundColor: '#0a0a0a', borderRadius: 24, padding: 4, borderWidth: 1, borderColor: '#1c1c1e' },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { color: '#555', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  filterTextActive: { color: '#000' },
  premiumPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#161616', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#1c1c1e' },
  premiumPillText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  vaultLocked: { height: 160, borderRadius: 20, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 8 },
  vaultLockedIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#161616', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1c1c1e' },
  vaultLockedTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  vaultLockedDesc: { color: '#555', fontSize: 11, fontWeight: '500', textAlign: 'center', lineHeight: 16 },
  vaultLockedCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 4 },
  vaultLockedCtaText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
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

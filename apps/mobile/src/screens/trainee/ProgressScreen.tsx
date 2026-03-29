import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
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
  type WorkoutLog,
  type BodyMetric,
  type ProgressPhoto,
  type UserProfile
} from "../../services/userSession";
import { uploadProgressPhoto } from "../../services/cloudinaryUpload";
import { ProgressCamera } from "../../components/ProgressCamera";
import { CompareSlider } from "../../components/CompareSlider";

// SMART GRID CONSTANTS
const GAP = 8;

const HighPerfImage = memo(({ url }: { url: string }) => (
  <Image
    source={{ uri: url }}
    style={styles.gridPhoto}
    resizeMode="cover"
    fadeDuration={0}
  />
), (prev, next) => prev.url === next.url);

const PhotoGridItem = memo(({
  photo,
  isSelected,
  isSelectionMode,
  isCompareMode,
  isCompareSelected,
  onSelect,
  onView,
  onLongPress,
  width
}: {
  photo: ProgressPhoto;
  isSelected: boolean;
  isSelectionMode: boolean;
  isCompareMode: boolean;
  isCompareSelected: boolean;
  onSelect: (p: ProgressPhoto) => void;
  onView: (url: string) => void;
  onLongPress: (p: ProgressPhoto) => void;
  width: number;
}) => {
  return (
    <Pressable
      style={[styles.gridPhotoBox, { width, height: width }]}
      onPress={() => (isSelectionMode || isCompareMode) ? onSelect(photo) : onView(photo.url)}
      onLongPress={() => onLongPress(photo)}
      delayLongPress={300}
    >
      <HighPerfImage url={photo.url} />
      
      {(isSelected || isCompareSelected) && (
        <View style={[styles.selectionBorderOverlay, isCompareSelected && { borderColor: colors.primary }]}>
          <View style={styles.deleteOverlay}>
            <Ionicons name={isCompareSelected ? "checkmark-circle" : "trash"} size={24} color="#fff" />
          </View>
        </View>
      )}

      {isCompareSelected && (
        <View style={styles.badgeLabel}>
          <Text style={styles.badgeText}>{isCompareSelected ? "COMPARE" : ""}</Text>
        </View>
      )}

      {!isSelectionMode && !isCompareMode && (
        <View style={styles.gridDateTag}>
          <Text style={styles.gridDateText}>
            {new Date(photo.date).toLocaleDateString([], { month: "short", day: "numeric" })}
          </Text>
        </View>
      )}
    </Pressable>
  );
}, (prev, next) => {
  return prev.isSelected === next.isSelected &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isCompareMode === next.isCompareMode &&
    prev.isCompareSelected === next.isCompareSelected &&
    prev.photo.url === next.photo.url &&
    prev.width === next.width;
});

function BFRow({ label, male, female, desc, onSelect }: any) {
  return (
    <Pressable style={styles.bfRow} onPress={onSelect}>
      <View style={styles.bfRowHeader}>
        <Text style={styles.bfRowLabel}>{label}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={[styles.genderTag, { backgroundColor: "#3b82f640" }]}><Text style={styles.genderTagText}>M: {male}</Text></View>
          <View style={[styles.genderTag, { backgroundColor: "#ec489940" }]}><Text style={styles.genderTagText}>F: {female}</Text></View>
        </View>
      </View>
      <Text style={styles.bfRowDesc}>{desc}</Text>
    </Pressable>
  );
}

export function ProgressScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
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

  // HELPERS
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

    const completedThisWeek = workouts.filter(w => {
      if (!w.createdAt) return false;
      const d = w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt);
      return d >= startOfWeek;
    }).length;

    return completedThisWeek;
  }, [workouts]);

  const weightChartData = useMemo(() => {
    return [...metrics].reverse().map(m => ({
      value: m.weight,
      label: new Date(m.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      dataPointText: m.weight.toString(),
    }));
  }, [metrics]);

  const itemWidth = useMemo(() => {
    return (windowWidth - 40 - (GAP * 2)) / 3;
  }, [windowWidth]);

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

    return () => {
      unsubWorkouts();
      unsubMetrics();
      unsubPhotos();
      unsubProfile();
    };
  }, []);

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
      {
        text: "Camera (Ghost Overlay)",
        onPress: () => setIsCameraVisible(true)
      },
      {
        text: "Import from Gallery",
        onPress: handlePickPhotoFromLibrary
      },
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
    // Sort by date so earlier is "before"
    const sorted = [...compareSelection].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setActiveComparePair([sorted[0], sorted[1]]);
  };

  return (
    <ScreenShell title="Progress" subtitle="Consistency Tracking" contentStyle={styles.shellContent}>
      {isLoading ? <View style={styles.loader}><ActivityIndicator color={colors.primary} /></View> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* COMPARE SLIDER OVERLAY */}
          <Modal visible={!!activeComparePair} transparent={false} animationType="slide">
            {activeComparePair && (
              <CompareSlider 
                beforeUri={activeComparePair[0].url}
                afterUri={activeComparePair[1].url}
                beforeDate={new Date(activeComparePair[0].date).toLocaleDateString()}
                afterDate={new Date(activeComparePair[1].date).toLocaleDateString()}
                onClose={() => setActiveComparePair(null)}
              />
            )}
          </Modal>

          {/* CAMERA OVERLAY */}
          <Modal visible={isCameraVisible} transparent={false} animationType="slide">
            <ProgressCamera 
              onClose={() => setIsCameraVisible(false)}
              onCapture={handleCapture}
              overlayUri={photos.length > 0 ? photos[0].url : undefined} // Overlay first photo (baseline)
            />
          </Modal>

          {/* VIEW MODAL */}
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

          <View style={styles.grid}>
            <MetricCard icon="calendar" label="This Week" value={weeklyConsistency} unit="Sessions" color="#FF9500" />
            <MetricCard icon="stats-chart" label="BMI" value={calculateBMI} unit="Metric" color={colors.success} />
            <MetricCard icon="scale" label="Weight" value={metrics[0]?.weight || "--"} unit="kg" color={colors.primary} />
            <MetricCard icon="body" label="Body Fat" value={metrics[0]?.bodyFat ? `${metrics[0].bodyFat}%` : "--"} unit="" color="#f87171" />
          </View>

          {weightChartData.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weight Trend</Text>
              <View style={styles.chartBox}>
                <LineChart
                  data={weightChartData}
                  height={150}
                  width={windowWidth - 80}
                  initialSpacing={20}
                  color={colors.primary}
                  thickness={3}
                  hideRules
                  hideYAxisText
                  yAxisColor="transparent"
                  xAxisColor="#2c2c2e"
                  dataPointsColor={colors.primary}
                  focusedDataPointColor="#fff"
                  pointerConfig={{
                    pointerStripColor: '#444',
                    pointerStripWidth: 2,
                    pointerColor: colors.primary,
                    radius: 6,
                    pointerLabelComponent: (items: any) => (
                      <View style={styles.chartPointerLabel}>
                        <Text style={styles.chartPointerText}>{items[0].value}kg</Text>
                      </View>
                    ),
                  }}
                />
              </View>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Log Metrics</Text>
              <Pressable onPress={() => setIsBFModalVisible(true)} hitSlop={10}>
                <Text style={styles.helpText}>Estimate Body Fat</Text>
              </Pressable>
            </View>

            <View style={styles.metricInputRow}>
              <View style={styles.stepperContainer}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => setNewWeight(prev => (Math.max(0, (Number(prev) || 70) - 0.5)).toString())}>
                    <Ionicons name="remove" size={18} color="#fff" />
                  </Pressable>
                  <TextInput
                    style={styles.stepInput}
                    keyboardType="decimal-pad"
                    value={newWeight}
                    onChangeText={setNewWeight}
                    placeholder="0.0"
                    placeholderTextColor="#444"
                  />
                  <Pressable style={styles.stepBtn} onPress={() => setNewWeight(prev => ((Number(prev) || 70) + 0.5).toString())}>
                    <Ionicons name="add" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.stepperContainer}>
                <Text style={styles.inputLabel}>Body Fat (%)</Text>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => setNewBodyFat(prev => (Math.max(0, (Number(prev) || 15) - 0.5)).toString())}>
                    <Ionicons name="remove" size={18} color="#fff" />
                  </Pressable>
                  <TextInput
                    style={styles.stepInput}
                    keyboardType="decimal-pad"
                    value={newBodyFat}
                    onChangeText={setNewBodyFat}
                    placeholder="0.0"
                    placeholderTextColor="#444"
                  />
                  <Pressable style={styles.stepBtn} onPress={() => setNewBodyFat(prev => ((Number(prev) || 15) + 0.5).toString())}>
                    <Ionicons name="add" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>

              <Pressable style={[styles.mainSaveBtn, isSaving && { opacity: 0.6 }]} onPress={handleLogMetric} disabled={isSaving}>
                <Ionicons name="checkmark" size={24} color={colors.primaryText} />
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Photos</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable style={styles.smallActionBtn} onPress={() => setIsGalleryVisible(true)}><Ionicons name="images-outline" size={18} color={colors.primary} /></Pressable>
                <Pressable style={styles.addBtn} onPress={handlePickPhoto}><Ionicons name="camera" size={20} color={colors.primaryText} /></Pressable>
              </View>
            </View>
            <Pressable style={styles.photoWidget} onPress={() => setIsGalleryVisible(true)}>
              {photos.length === 0 ? <View style={styles.widgetEmpty}><Text style={styles.widgetEmptyText}>Tap to add</Text></View> : (
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
          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

function MetricCard({ icon, label, value, unit, color }: any) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={20} color={color} /></View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value} <Text style={styles.metricUnit}>{unit}</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: { paddingBottom: 0 },
  loader: { padding: 100, alignItems: "center" },
  scroll: { paddingBottom: 120, gap: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  metricCard: { flex: 1, minWidth: "45%", backgroundColor: "#161616", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#2c2c2e", gap: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  metricLabel: { color: "#8c8c8c", fontSize: 13, fontWeight: "700" },
  metricValue: { color: "#ffffff", fontSize: 22, fontWeight: "900" },
  metricUnit: { fontSize: 12, color: "#444" },
  card: { backgroundColor: "#161616", borderRadius: 28, padding: 20, borderWidth: 1, borderColor: "#2c2c2e", gap: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  metricInputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", marginTop: 4 },
  stepperContainer: { flex: 1, gap: 6 },
  stepper: { flexDirection: "row", backgroundColor: "#1c1c1e", borderRadius: 14, borderWidth: 1, borderColor: "#2c2c2e", height: 50, alignItems: "center", overflow: "hidden" },
  stepBtn: { width: 40, height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#2c2c2e50" },
  stepInput: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "800", textAlign: "center", padding: 0 },
  mainSaveBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  inputLabel: { color: "#8c8c8c", fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginLeft: 4 },
  helpText: { color: colors.primary, fontSize: 11, fontWeight: "700", textDecorationLine: "underline" },
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
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
  gridPhotoBox: { borderRadius: 12, overflow: "hidden", backgroundColor: "#1c1c1e" },
  gridPhoto: { width: "100%", height: "100%" },
  gridDateTag: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.7)", paddingVertical: 4 },
  gridDateText: { color: "#fff", fontSize: 8, fontWeight: "900", textAlign: "center" },
  selectionBorderOverlay: { ...StyleSheet.absoluteFillObject, borderColor: "#ff4444", borderWidth: 3, borderRadius: 12, backgroundColor: "rgba(255, 68, 68, 0.2)" },
  deleteOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  viewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  viewerClose: { position: "absolute", top: 60, right: 30, zIndex: 10 },
  viewerContent: { width: "100%", height: "80%" },
  viewerImage: { width: "100%", height: "100%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 20 },
  estimateBox: { backgroundColor: "#161616", borderRadius: 28, padding: 20, width: "100%", borderWidth: 1, borderColor: "#2c2c2e", gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalDesc: { color: "#8c8c8c", fontSize: 13, fontWeight: "500", lineHeight: 18 },
  bfRow: { backgroundColor: "#1c1c1e", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#2c2c2e" },
  bfRowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  bfRowLabel: { color: "#fff", fontSize: 15, fontWeight: "800" },
  bfRowDesc: { color: "#8c8c8c", fontSize: 12, fontWeight: "500" },
  genderTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  genderTagText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  chartBox: { marginTop: 10, alignItems: 'center' },
  chartPointerLabel: {
    backgroundColor: colors.primary,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  chartPointerText: { color: '#000', fontWeight: '900', fontSize: 10 },
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
  badgeLabel: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#000', fontSize: 8, fontWeight: '900' },
});

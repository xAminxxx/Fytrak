import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, TextInput, Alert, Image } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import * as ImagePicker from "expo-image-picker";
import {
  subscribeToWorkouts,
  subscribeToLatestMetrics,
  saveBodyMetric,
  subscribeToProgressPhotos,
  saveProgressPhoto,
  type WorkoutLog,
  type BodyMetric,
  type ProgressPhoto
} from "../../services/userSession";

export function ProgressScreen() {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Metric Input State
  const [newWeight, setNewWeight] = useState("");
  const [newBodyFat, setNewBodyFat] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubWorkouts = subscribeToWorkouts(user.uid, (data) => {
      setWorkouts(data);
    });

    const unsubMetrics = subscribeToLatestMetrics(user.uid, (data) => {
      setMetrics(data);
      setIsLoading(false);
    });

    const unsubPhotos = subscribeToProgressPhotos(user.uid, setPhotos);

    return () => {
      unsubWorkouts();
      unsubMetrics();
      unsubPhotos();
    };
  }, []);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "We need camera roll access to upload photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const user = auth.currentUser;
      if (!user) return;

      try {
        setIsSaving(true);
        await saveProgressPhoto(user.uid, {
          url: `data:image/jpeg;base64,${result.assets[0].base64}`,
          date: new Date().toISOString().split("T")[0],
          type: "front"
        });
        Alert.alert("Success", "Progress photo added!");
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to upload photo.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const performanceStats = useMemo(() => {
    const totalWorkouts = workouts.length;
    const streak = totalWorkouts > 0 ? 1 : 0;
    const adherence = totalWorkouts > 0 ? Math.min(Math.round((totalWorkouts / 4) * 100), 100) : 0;

    return { streak, adherence, totalWorkouts };
  }, [workouts]);

  const latestWeight = useMemo(() => metrics[0]?.weight?.toString() || "--", [metrics]);
  const latestBF = useMemo(() => metrics[0]?.bodyFat?.toString() || "--", [metrics]);

  const handleLogMetric = async () => {
    if (!newWeight || isNaN(Number(newWeight))) {
      Alert.alert("Invalid Input", "Please enter a valid weight.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setIsSaving(true);
      await saveBodyMetric(user.uid, {
        weight: Number(newWeight),
        bodyFat: newBodyFat ? Number(newBodyFat) : undefined
      });
      setNewWeight("");
      setNewBodyFat("");
      Alert.alert("Success", "Metrics logged successfully!");
    } catch (error) {
      console.error("Log metric failed:", error);
      Alert.alert("Error", "Failed to save metrics.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenShell
      title="Progress"
      subtitle="Track your consistency and metrics"
      contentStyle={styles.shellContent}
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* METRICS GRID */}
          <View style={styles.grid}>
            <MetricCard icon="flame" label="Streak" value={performanceStats.streak} unit="days" color="#FF9500" />
            <MetricCard icon="checkmark-circle" label="Adherence" value={performanceStats.adherence} unit="%" color={colors.success} />
            <MetricCard icon="scale" label="Weight" value={latestWeight} unit="kg" color={colors.primary} />
            <MetricCard icon="body" label="Body Fat" value={latestBF} unit="%" color="#f87171" />
          </View>

          {/* LOG METRICS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Log Today's Metrics</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                  value={newWeight}
                  onChangeText={setNewWeight}
                />
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Body Fat (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                  value={newBodyFat}
                  onChangeText={setNewBodyFat}
                />
              </View>
              <Pressable
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleLogMetric}
                disabled={isSaving}
              >
                <Ionicons name="add" size={24} color={colors.primaryText} />
              </Pressable>
            </View>
          </View>

          {/* CHART AREA */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Weight trend (Last 7 Logs)</Text>
              <Ionicons name="trending-down" size={20} color={colors.success} />
            </View>
            <View style={styles.chartArea}>
              {metrics.slice(0, 7).reverse().map((m, i) => {
                const maxWeight = Math.max(...metrics.map(x => x.weight));
                const minWeight = Math.min(...metrics.map(x => x.weight));
                const range = maxWeight - minWeight || 10;
                const h = ((m.weight - minWeight + (range * 0.2)) / (range * 1.4)) * 100;

                return (
                  <View key={m.id} style={styles.chartCol}>
                    <View style={[styles.chartBar, { height: `${Math.max(20, h)}%` }]} />
                    <Text style={styles.chartLabel}>{new Date(m.date).toLocaleDateString([], { month: "short", day: "numeric" })}</Text>
                  </View>
                );
              })}
              {metrics.length === 0 && (
                <Text style={styles.emptyChartText}>Log your weight to see progress</Text>
              )}
            </View>
          </View>

          {/* PHOTOS SECTION */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Progress Photos</Text>
              <Pressable style={styles.addBtn} onPress={handlePickPhoto}>
                <Ionicons name="camera" size={20} color={colors.primaryText} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
              {photos.length === 0 ? (
                <PhotoPlaceholder date="No photos logged" />
              ) : (
                photos.map((p) => (
                  <View key={p.id} style={styles.photoBox}>
                    <View style={styles.photoInner}>
                      <Image source={{ uri: p.url }} style={styles.photoImage} />
                    </View>
                    <Text style={styles.photoDate}>{new Date(p.date).toLocaleDateString([], { month: "short", day: "numeric" })}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

function MetricCard({ icon, label, value, unit, color }: any) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value} <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function PhotoPlaceholder({ date }: { date: string }) {
  return (
    <View style={styles.photoBox}>
      <View style={styles.photoInner}>
        <Ionicons name="image-outline" size={24} color="#333" />
      </View>
      <Text style={styles.photoDate}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    paddingBottom: 0,
  },
  loader: {
    padding: 100,
    alignItems: "center",
  },
  scroll: {
    paddingBottom: 120,
    gap: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    color: "#8c8c8c",
    fontSize: 13,
    fontWeight: "700",
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  metricUnit: {
    fontSize: 12,
    color: "#444",
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },
  inputWrap: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    color: "#8c8c8c",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 12,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  saveBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chartArea: {
    flexDirection: "row",
    height: 120,
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 20,
  },
  emptyChartText: {
    color: "#444",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
    marginBottom: 40,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  chartBar: {
    width: 12,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  chartLabel: {
    color: "#444",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  photosRow: {
    flexDirection: "row",
    gap: 12,
  },
  photoBox: {
    flex: 1,
    gap: 8,
  },
  photoInner: {
    aspectRatio: 1,
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoDate: {
    color: "#8c8c8c",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
});

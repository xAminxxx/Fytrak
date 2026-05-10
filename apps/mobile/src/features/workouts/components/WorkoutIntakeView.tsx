import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/colors";
import { radius, spacing, typography } from "../../../theme/tokens";
import { SectionTitle } from "../../../components/SectionTitle";
import { MetricStepper } from "../../../components/MetricStepper";
import type { ProfileLevel } from "../../../services/userSession";

type WorkoutIntakeViewProps = {
  level: ProfileLevel;
  onLevelChange: (level: ProfileLevel) => void;
  trainingExp: string;
  onTrainingExpChange: (value: string) => void;
  injuries: string;
  onInjuriesChange: (value: string) => void;
  flexibility: number;
  onFlexibilityChange: (value: number) => void;
  lastTrainedDate: Date;
  onLastTrainedDateChange: (value: Date) => void;
  healthIssues: string;
  onHealthIssuesChange: (value: string) => void;
  workStress: number;
  onWorkStressChange: (value: number) => void;
  workToughness: number;
  onWorkToughnessChange: (value: number) => void;
  workStart: Date;
  onWorkStartChange: (value: Date) => void;
  workEnd: Date;
  onWorkEndChange: (value: Date) => void;
  isSaving: boolean;
  onSubmit: () => void;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

export function WorkoutIntakeView({
  level,
  onLevelChange,
  trainingExp,
  onTrainingExpChange,
  injuries,
  onInjuriesChange,
  flexibility,
  onFlexibilityChange,
  lastTrainedDate,
  onLastTrainedDateChange,
  healthIssues,
  onHealthIssuesChange,
  workStress,
  onWorkStressChange,
  workToughness,
  onWorkToughnessChange,
  workStart,
  onWorkStartChange,
  workEnd,
  onWorkEndChange,
  isSaving,
  onSubmit,
}: WorkoutIntakeViewProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWorkStartPicker, setShowWorkStartPicker] = useState(false);
  const [showWorkEndPicker, setShowWorkEndPicker] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.onboardCard}>
        <SectionTitle title="EXPERIENCE" icon="fitness" />
        <View style={styles.groupRow}>
          {(["Beginner", "Intermediate", "Advanced"] as const).map((item) => (
            <Pressable
              key={item}
              style={[styles.pill, level === item && styles.pillActive]}
              onPress={() => onLevelChange(item)}
            >
              <Text style={[styles.pillText, level === item && styles.pillTextActive]}>
                {item.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Training Months?</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#666"
            value={trainingExp}
            onChangeText={onTrainingExpChange}
          />
        </View>

        <SectionTitle title="HEALTH" icon="medkit" />
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Injuries?</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#666"
            value={injuries}
            onChangeText={onInjuriesChange}
          />
        </View>
        <View style={styles.row}>
          <MetricStepper
            label="Flexibility (1-10)"
            value={flexibility}
            onAdjust={(delta: number) =>
              onFlexibilityChange(clamp(flexibility + delta, 1, 10))
            }
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Session?</Text>
          <Pressable
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>{lastTrainedDate.toDateString()}</Text>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={lastTrainedDate}
              mode="date"
              display="spinner"
              onChange={(_: unknown, date?: Date) => {
                setShowDatePicker(false);
                if (date) onLastTrainedDateChange(date);
              }}
            />
          )}
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medical / Postures</Text>
          <TextInput
            style={[styles.input, styles.multiLineInput]}
            multiline
            placeholder="Describe any issues..."
            placeholderTextColor="#666"
            value={healthIssues}
            onChangeText={onHealthIssuesChange}
          />
        </View>

        <SectionTitle title="WORK LIFE" icon="briefcase" />
        <View style={styles.inputGroup}>
          <View style={styles.row}>
            <TimeInput
              label="START"
              date={workStart}
              onPress={() => setShowWorkStartPicker(true)}
            />
            <TimeInput
              label="END"
              date={workEnd}
              onPress={() => setShowWorkEndPicker(true)}
            />
          </View>
          {showWorkStartPicker && (
            <DateTimePicker
              value={workStart}
              mode="time"
              display="spinner"
              onChange={(_: unknown, date?: Date) => {
                setShowWorkStartPicker(false);
                if (date) onWorkStartChange(date);
              }}
            />
          )}
          {showWorkEndPicker && (
            <DateTimePicker
              value={workEnd}
              mode="time"
              display="spinner"
              onChange={(_: unknown, date?: Date) => {
                setShowWorkEndPicker(false);
                if (date) onWorkEndChange(date);
              }}
            />
          )}
        </View>
        <View style={styles.row}>
          <MetricStepper
            label="Work Stress"
            value={workStress}
            onAdjust={(delta: number) =>
              onWorkStressChange(clamp(workStress + delta, 1, 10))
            }
          />
          <MetricStepper
            label="Physicality"
            value={workToughness}
            onAdjust={(delta: number) =>
              onWorkToughnessChange(clamp(workToughness + delta, 1, 10))
            }
          />
        </View>
        <Pressable style={styles.finishBtn} onPress={onSubmit} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.finishBtnText}>START TRAINING</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

type TimeInputProps = {
  label: string;
  date: Date;
  onPress: () => void;
};

function TimeInput({ label, date, onPress }: TimeInputProps) {
  return (
    <Pressable style={styles.timeLink} onPress={onPress}>
      <Text style={styles.timeValue}>
        {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>
      <Text style={styles.timerLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 220, gap: spacing.lg },
  onboardCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.lg,
  },
  groupRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: "#8c8c8c", fontSize: 11, fontWeight: "900" },
  pillTextActive: { color: "#000" },
  inputGroup: { gap: 4, marginBottom: 12 },
  label: { color: "#8c8c8c", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  input: {
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    padding: 14,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  multiLineInput: { height: 80 },
  row: { flexDirection: "row", gap: 12, marginBottom: 16 },
  dateInput: {
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  dateText: { color: "#fff" },
  timeLink: {
    flex: 1,
    padding: 12,
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  timeValue: { color: "#fff", fontSize: 13 },
  timerLabel: { color: "#444", fontSize: 8, fontWeight: "900" },
  finishBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  finishBtnText: { color: colors.primaryText, ...typography.button, fontSize: 16 },
});

import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import type { CompleteProfilePayload } from "../../services/userSession";

type CompleteProfileScreenProps = {
  onComplete: (payload: CompleteProfilePayload) => Promise<void>;
};

export function CompleteProfileScreen({ onComplete }: CompleteProfileScreenProps) {
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [injuries, setInjuries] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const canSubmit = useMemo(() => goal.trim().length > 2 && !isSubmitting, [goal, isSubmitting]);

  const handleContinue = async () => {
    if (!canSubmit) return;
    try {
      setIsSubmitting(true);
      setErrorText(null);
      await onComplete({ goal, level, injuries });
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell
      title="Personalize"
      subtitle="Complete your profile to get the best experience"
      contentStyle={styles.shellContent}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>What is your primary fitness goal?</Text>
              <TextInput
                placeholder="e.g. Lose 5kg of fat, build muscle"
                placeholderTextColor="#666"
                style={styles.input}
                value={goal}
                onChangeText={setGoal}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select your current level</Text>
              <View style={styles.levelRow}>
                {(["Beginner", "Intermediate", "Advanced"] as const).map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setLevel(item)}
                    style={[styles.levelPill, level === item && styles.levelPillActive]}
                  >
                    <Text style={[styles.levelPillText, level === item && styles.levelPillTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Injuries or limitations (optional)</Text>
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="Any history of injuries or medical conditions"
                placeholderTextColor="#666"
                style={[styles.input, styles.textArea]}
                value={injuries}
                onChangeText={setInjuries}
              />
            </View>

            <Pressable
              style={[styles.finishBtn, !canSubmit && styles.disabledButton]}
              disabled={!canSubmit}
              onPress={() => void handleContinue()}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <>
                  <Text style={styles.finishBtnText}>START YOUR JOURNEY</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.primaryText} />
                </>
              )}
            </Pressable>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={18} color="#4ade80" />
            <Text style={styles.infoText}>Your data is private and only shared with your assigned coach.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    paddingBottom: 0,
  },
  scroll: {
    paddingBottom: 40,
    marginTop: 10,
    gap: 20,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 24,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 2,
  },
  input: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  levelRow: {
    flexDirection: "row",
    gap: 10,
  },
  levelPill: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  levelPillActive: {
    borderColor: colors.primary,
    backgroundColor: "#22251a",
  },
  levelPillText: {
    color: "#8c8c8c",
    fontWeight: "700",
    fontSize: 13,
  },
  levelPillTextActive: {
    color: colors.primary,
  },
  finishBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  finishBtnText: {
    color: colors.primaryText,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    color: "#ff4444",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#161616",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  infoText: {
    flex: 1,
    color: "#8c8c8c",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
});

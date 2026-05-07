import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";
import { Typography } from "./Typography";
import { PrimaryButton } from "./Button";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Typography variant="h2" style={styles.title}>{title}</Typography>
      <Typography variant="bodySmall" color={colors.textMuted} style={styles.message}>
        {message}
      </Typography>
      {actionLabel && onAction ? (
        <PrimaryButton title={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["3xl"],
    gap: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: "rgba(255, 204, 0, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    maxWidth: 280,
  },
  action: {
    minWidth: 180,
    marginTop: spacing.sm,
  },
});

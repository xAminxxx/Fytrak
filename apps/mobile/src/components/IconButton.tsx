import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, touchTarget } from "../theme/tokens";

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: "default" | "primary" | "danger";
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = "default",
  size = "md",
  style,
  disabled,
}: IconButtonProps) {
  const dimension = size === "lg" ? touchTarget.large : touchTarget.comfortable;
  const iconColor = disabled
    ? colors.textFaint
    : tone === "primary"
      ? colors.primary
      : tone === "danger"
        ? colors.danger
        : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={8}
      style={[
        styles.base,
        styles[tone],
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={size === "lg" ? 26 : 22} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  default: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSubtle,
  },
  primary: {
    backgroundColor: colors.primaryMuted,
    borderColor: "rgba(255, 204, 0, 0.26)",
  },
  danger: {
    backgroundColor: colors.dangerMuted,
    borderColor: "rgba(248, 113, 113, 0.28)",
  },
  disabled: {
    opacity: 0.5,
  },
});

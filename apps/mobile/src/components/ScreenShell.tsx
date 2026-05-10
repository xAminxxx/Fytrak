import { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, touchTarget, typography } from "../theme/tokens";
import { IconButton } from "./IconButton";

type ScreenShellProps = PropsWithChildren<{
  title: ReactNode;
  subtitle?: string;
  centered?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  leftActionIcon?: keyof typeof Ionicons.glyphMap;
  onLeftAction?: () => void;
  rightActionIcon?: keyof typeof Ionicons.glyphMap;
  rightActionImageUri?: string;
  onRightAction?: () => void;
}>;

export function ScreenShell({
  title,
  subtitle,
  centered = false,
  titleStyle,
  subtitleStyle,
  contentStyle,
  leftActionIcon,
  onLeftAction,
  rightActionIcon,
  rightActionImageUri,
  onRightAction,
  children,
}: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.container, centered && styles.containerCentered]}>
        <View style={[styles.header, centered && { alignItems: "center" }]}>
          <View style={[styles.headerTitleRow, centered && { justifyContent: "center", width: "100%" }]}>
            {leftActionIcon && onLeftAction && (
              <IconButton
                icon={leftActionIcon}
                onPress={onLeftAction}
                accessibilityLabel="Go back"
                style={styles.leftButton}
              />
            )}
            {typeof title === "string" ? (
              <Text 
                numberOfLines={1} 
                style={[styles.title, titleStyle, !centered && { flex: 1 }, centered && { textAlign: "center" }]}
              >
                {title.toUpperCase()}
              </Text>
            ) : (
              <View style={centered && { alignItems: "center", justifyContent: "center" }}>
                {title}
              </View>
            )}
            {(rightActionIcon || rightActionImageUri) && onRightAction && (
              <Pressable
                onPress={onRightAction}
                accessibilityRole="button"
                accessibilityLabel={rightActionImageUri ? "Open profile" : "Open action"}
                hitSlop={8}
                style={[styles.headerButton, rightActionImageUri && styles.avatarButton]}
              >
                {rightActionImageUri ? (
                  <Image source={{ uri: rightActionImageUri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name={rightActionIcon!} size={24} color={colors.primary} />
                )}
              </Pressable>
            )}
          </View>
          {subtitle ? <Text style={[styles.subtitle, subtitleStyle, centered && { textAlign: "center" }]}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.content, centered && styles.contentCentered, contentStyle]}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  containerCentered: {
    justifyContent: "center",
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerButton: {
    width: touchTarget.comfortable,
    height: touchTarget.comfortable,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  leftButton: {
    marginRight: spacing.lg,
  },
  avatarButton: {
    borderWidth: 0,
    padding: 0,
    backgroundColor: "transparent",
  },
  avatarImage: {
    width: touchTarget.comfortable,
    height: touchTarget.comfortable,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  title: {
    ...typography.display,
    color: colors.primary,
    letterSpacing: 1.0,
    paddingRight: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    ...typography.bodySmall,
  },
  content: {
    flex: 1,
    marginTop: spacing.sm,
  },
  contentCentered: {
    flex: 0,
    marginTop: spacing.xl,
  },
});

import { PropsWithChildren } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  centered?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  rightActionIcon?: keyof typeof Ionicons.glyphMap;
  onRightAction?: () => void;
}>;

export function ScreenShell({
  title,
  subtitle,
  centered = false,
  titleStyle,
  subtitleStyle,
  contentStyle,
  rightActionIcon,
  onRightAction,
  children,
}: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={[styles.container, centered && styles.containerCentered]}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text numberOfLines={1} style={[styles.title, titleStyle, { flex: 1 }]}>
              {title.toUpperCase()}
            </Text>
            {rightActionIcon && onRightAction && (
              <Pressable onPress={onRightAction} style={styles.headerButton}>
                <Ionicons name={rightActionIcon} size={28} color={colors.primary} />
              </Pressable>
            )}
          </View>
          {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
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
    paddingHorizontal: 20,
  },
  containerCentered: {
    justifyContent: "center",
  },
  header: {
    marginTop: 20,
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 1.0,
    fontStyle: "italic",
    lineHeight: 48,
    paddingRight: 10,
  },
  subtitle: {
    marginTop: 4,
    color: "#8c8c8c",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  content: {
    flex: 1,
    marginTop: 10,
  },
  contentCentered: {
    flex: 0,
    marginTop: 20,
  },
});


import { useEffect, useRef, useState } from "react";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Keyboard, Pressable, StyleSheet, Text, Dimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { radius } from "../theme/tokens";

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  Workouts: "barbell-outline",
  Nutrition: "nutrition-outline",
  Home: "home-outline",
  Progress: "stats-chart-outline",
  Chat: "chatbubbles-outline",
  // Coach routes
  CoachHome: "grid-outline",
  CoachClients: "people-outline",
  CoachLibrary: "library-outline",
  CoachInbox: "chatbubbles-outline",
  CoachProfile: "person-outline",
};

const ACTIVE_CIRCLE_SIZE = 44;
const TAB_BAR_HORIZONTAL_MARGIN = 48;

const labelByRoute: Record<string, string> = {
  Home: "Today",
  Workouts: "Workout",
  Nutrition: "Nutrition",
  Progress: "Progress",
  Chat: "Coach",
  CoachHome: "Today",
  CoachClients: "Clients",
  CoachLibrary: "Library",
  CoachInbox: "Inbox",
  CoachProfile: "Profile",
};

type FytrakTabBarProps = {
  state: TabNavigationState<ParamListBase>;
  navigation: {
    emit: (options: { type: "tabPress"; target?: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

export function FytrakTabBar({ state, navigation }: FytrakTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");
  const barWidth = width - TAB_BAR_HORIZONTAL_MARGIN;
  const tabWidth = barWidth / state.routes.length;

  const translateX = useRef(new Animated.Value(0)).current;
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  }, [state.index, tabWidth]);

  if (isKeyboardVisible) return null;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { width: barWidth }]}>
        <Animated.View
          style={[
            styles.indicator,
            {
              width: tabWidth,
              transform: [{
                translateX: translateX.interpolate({
                  inputRange: [0, tabWidth * (state.routes.length - 1)],
                  outputRange: [0, tabWidth * (state.routes.length - 1)]
                })
              }],
            },
          ]}
        >
          <View style={styles.indicatorBubble} />
        </Animated.View>

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = iconByRoute[route.name] ?? "ellipse-outline";
          const activeIconName = iconName.replace("-outline", "") as keyof typeof Ionicons.glyphMap;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityLabel={`${route.name} tab`}
              accessibilityState={{ selected: isFocused }}
              style={styles.tabButton}
              hitSlop={8}
            >
              <View style={styles.iconSlot}>
                <AnimatedIcon
                  name={isFocused ? activeIconName : iconName}
                  color={isFocused ? colors.primary : "#8c8c8c"}
                  size={22}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {labelByRoute[route.name] ?? route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AnimatedIcon({
  name,
  color,
  size,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "transparent",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    height: 68,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  indicator: {
    position: "absolute",
    top: 5,
    alignItems: "center",
  },
  indicatorBubble: {
    width: ACTIVE_CIRCLE_SIZE,
    height: ACTIVE_CIRCLE_SIZE,
    borderRadius: radius.pill,
    backgroundColor: "#0b0b0b",
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 10,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    height: "100%",
    minWidth: 44,
    zIndex: 1,
    paddingTop: 5,
    paddingBottom: 9,
  },
  iconSlot: {
    width: ACTIVE_CIRCLE_SIZE,
    height: ACTIVE_CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    color: "#8c8c8c",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11,
    marginTop: 0,
    textAlign: "center",
    width: "100%",
  },
  tabLabelActive: {
    color: colors.primary,
  },
});




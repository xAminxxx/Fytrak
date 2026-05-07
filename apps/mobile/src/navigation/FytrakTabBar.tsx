import { useEffect, useRef, useState } from "react";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet, useWindowDimensions, View, Keyboard } from "react-native";
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
  CoachProfile: "person-outline",
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
  const { width } = useWindowDimensions();
  const tabWidth = (width - 40) / state.routes.length; // Adjusted for paddingHorizontal 20

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
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 15) }]}>
      <View style={[styles.bar, { width: width - 48 }]}>
        <Animated.View
          style={[
            styles.indicator,
            {
              width: (width - 48) / state.routes.length,
              transform: [{
                translateX: translateX.interpolate({
                  inputRange: [0, (width - 40) / state.routes.length * (state.routes.length - 1)],
                  outputRange: [0, (width - 48) / state.routes.length * (state.routes.length - 1)]
                })
              }],
            },
          ]}
        >
          <View style={styles.indicatorBubble}>
            <View style={styles.indicatorGlow} />
          </View>
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
              <AnimatedIcon
                isFocused={isFocused}
                name={isFocused ? activeIconName : iconName}
                color={isFocused ? colors.primary : "#8c8c8c"}
                size={isFocused ? 28 : 24}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AnimatedIcon({
  isFocused,
  name,
  color,
  size,
}: {
  isFocused: boolean;
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 5,
    }).start();

    Animated.spring(translateY, {
      toValue: isFocused ? -22 : 0, // Lift icon into the bubble
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, [isFocused]);

  return (
    <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
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
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorBubble: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: "#0b0b0b",
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -42,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  indicatorGlow: {
    width: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    position: "absolute",
    bottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    minWidth: 44,
    zIndex: 1,
  },
});




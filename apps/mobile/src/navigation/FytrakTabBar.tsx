import { useEffect, useRef } from "react";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

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

export function FytrakTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabWidth = (width - 40) / state.routes.length; // Adjusted for paddingHorizontal 20

  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  }, [state.index, tabWidth]);

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
            <Pressable key={route.key} onPress={onPress} style={styles.tabButton}>
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
    backgroundColor: "#1c1c1e",
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: "#2c2c2e",
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
    borderRadius: 30,
    backgroundColor: "#0b0b0b",
    borderWidth: 2,
    borderColor: "#333",
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
    zIndex: 1,
  },
});




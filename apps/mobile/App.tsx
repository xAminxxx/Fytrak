import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import "./src/i18n";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { Toast } from "./src/components/Toast";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from 'expo-font';
import * as SplashScreenNative from 'expo-splash-screen';
import { useCallback } from "react";

// Keep the native splash screen visible while we fetch resources
SplashScreenNative.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Adcure': require('./assets/fonts/Adcure-Regular.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreenNative.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View onLayout={onLayoutRootView} style={styles.container}>
        <RootNavigator />
        <Toast />
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

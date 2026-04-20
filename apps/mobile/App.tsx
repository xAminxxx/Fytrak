import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import "./src/i18n";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { Toast } from "./src/components/Toast";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from 'expo-font';
import * as SplashScreenNative from 'expo-splash-screen';
import { useCallback, useState, useEffect } from "react";
import { useVideoPlayer, VideoView } from 'expo-video';

// Keep the native splash screen visible while we fetch resources
SplashScreenNative.preventAutoHideAsync();

const SPLASH_VIDEO = require('./assets/branding/splash-logo.mp4');

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Adcure': require('./assets/fonts/Adcure-Regular.ttf'),
  });

  const [isVideoFinished, setIsVideoFinished] = useState(false);

  // Use the modern expo-video player
  const player = useVideoPlayer(SPLASH_VIDEO, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      setIsVideoFinished(true);
    });

    return () => {
      subscription.remove();
    };
  }, [player]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      // Hide native splash once fonts are ready
      // The video player would have already started in the background
      await SplashScreenNative.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // If the video is still playing, show it
  if (!isVideoFinished) {
    return (
      <View onLayout={onLayoutRootView} style={styles.splashContainer}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="contain"
          nativeControls={false}
        />
        <StatusBar style="light" />
      </View>
    );
  }

  // Once video finishes, show the actual app content
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
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
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

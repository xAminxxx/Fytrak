import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { AppLogo } from '../../components/Branding';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => onFinishRef.current());
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <AppLogo width={240} height={120} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

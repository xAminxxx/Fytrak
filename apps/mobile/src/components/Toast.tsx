import React, { useState, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, DeviceEventEmitter, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Typography } from './Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ToastEvent = 'SHOW_TOAST';

type ToastType = 'success' | 'error' | 'info';

type ToastConfig = {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
};

// Global imperative API
export const ToastService = {
  show: (config: ToastConfig) => {
    DeviceEventEmitter.emit(ToastEvent, config);
  },
  success: (title: string, message?: string) => {
    DeviceEventEmitter.emit(ToastEvent, { title, message, type: 'success' });
  },
  error: (title: string, message?: string) => {
    DeviceEventEmitter.emit(ToastEvent, { title, message, type: 'error' });
  },
  info: (title: string, message?: string) => {
    DeviceEventEmitter.emit(ToastEvent, { title, message, type: 'info' });
  }
};

export function Toast() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ToastConfig>({ title: '', type: 'success' });
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => setVisible(false));
  };

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener(ToastEvent, (data: ToastConfig) => {
      setConfig({ ...data, type: data.type || 'success' });
      setVisible(true);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      translateY.setValue(-150);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + 10,
          useNativeDriver: true,
          bounciness: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();

      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, data.duration || 3000);
    });

    return () => {
      listener.remove();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [insets.top]);

  if (!visible) return null;

  const getIcon = () => {
    switch (config.type) {
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  const getIconColor = () => {
    switch (config.type) {
      case 'error': return '#ff4444';
      case 'info': return '#4da6ff';
      default: return colors.primary;
    }
  };

  return (
    <Animated.View style={[
      styles.container,
      { transform: [{ translateY }], opacity }
    ]}>
      <Pressable onPress={hideToast} style={styles.innerContainer}>
        <View style={[styles.iconContainer, { backgroundColor: getIconColor() }]}>
          <Ionicons name={getIcon()} size={24} color="#000" />
        </View>
        <View style={styles.content}>
          <Typography variant="h2" style={styles.title}>{config.title}</Typography>
          {config.message ? <Text style={styles.message}>{config.message}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 99999,
  },
  innerContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: { flex: 1, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 16 },
  message: { color: '#8c8c8c', fontSize: 13, marginTop: 4, fontWeight: '600' },
});

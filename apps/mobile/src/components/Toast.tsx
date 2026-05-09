import React, { useState, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, DeviceEventEmitter, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Typography } from './Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ToastEvent = 'SHOW_TOAST';

type ToastType = 'success' | 'error' | 'info' | 'confirm';

type ToastConfig = {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDestructive?: boolean;
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
  },
  confirm: (opts: {
    title: string;
    message?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }) => {
    DeviceEventEmitter.emit(ToastEvent, {
      title: opts.title,
      message: opts.message,
      type: 'confirm' as ToastType,
      onConfirm: opts.onConfirm,
      onCancel: opts.onCancel,
      confirmLabel: opts.confirmLabel || 'Confirm',
      cancelLabel: opts.cancelLabel || 'Cancel',
      confirmDestructive: opts.destructive ?? false,
    });
  },
};

export function Toast() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ToastConfig>({ title: '', type: 'success' });
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<{ onConfirm?: () => void; onCancel?: () => void }>({});

  const hideToast = (runCancel?: boolean) => {
    if (runCancel && callbackRef.current.onCancel) {
      callbackRef.current.onCancel();
    }
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
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      callbackRef.current = {};
    });
  };

  const handleConfirm = () => {
    if (callbackRef.current.onConfirm) {
      callbackRef.current.onConfirm();
    }
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
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      callbackRef.current = {};
    });
  };

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener(ToastEvent, (data: ToastConfig) => {
      const isConfirm = data.type === 'confirm';

      // Store callbacks in ref to avoid stale closures
      callbackRef.current = {
        onConfirm: data.onConfirm,
        onCancel: data.onCancel,
      };

      setConfig({ ...data, type: data.type || 'success' });
      setVisible(true);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      translateY.setValue(-150);
      opacity.setValue(0);
      backdropOpacity.setValue(0);

      const animations: Animated.CompositeAnimation[] = [
        Animated.spring(translateY, {
          toValue: insets.top + 10,
          useNativeDriver: true,
          bounciness: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ];

      if (isConfirm) {
        animations.push(
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        );
      }

      Animated.parallel(animations).start();

      // Auto-dismiss only for non-confirm toasts
      if (!isConfirm) {
        timeoutRef.current = setTimeout(() => {
          hideToast();
        }, data.duration || 3000);
      }
    });

    return () => {
      listener.remove();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [insets.top]);

  if (!visible) return null;

  const isConfirm = config.type === 'confirm';

  const getIcon = () => {
    switch (config.type) {
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
      case 'confirm': return 'help-circle';
      default: return 'checkmark-circle';
    }
  };

  const getIconColor = () => {
    switch (config.type) {
      case 'error': return '#ff4444';
      case 'info': return '#4da6ff';
      case 'confirm': return config.confirmDestructive ? '#ff4444' : '#fbbf24';
      default: return colors.primary;
    }
  };

  return (
    <>
      {/* Backdrop for confirm toasts */}
      {isConfirm && (
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents={isConfirm ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => hideToast(true)} />
        </Animated.View>
      )}

      <Animated.View style={[
        styles.container,
        { transform: [{ translateY }], opacity }
      ]}>
        <Pressable
          onPress={isConfirm ? undefined : () => hideToast()}
          style={[styles.innerContainer, isConfirm && styles.confirmContainer]}
        >
          <View style={styles.topRow}>
            <View style={[styles.iconContainer, { backgroundColor: getIconColor() }]}>
              <Ionicons name={getIcon()} size={24} color="#000" />
            </View>
            <View style={styles.content}>
              <Typography variant="h2" style={styles.title}>{config.title}</Typography>
              {config.message ? <Text style={styles.message}>{config.message}</Text> : null}
            </View>
          </View>

          {/* Action buttons for confirm toasts */}
          {isConfirm && (
            <View style={styles.buttonRow}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => hideToast(true)}
              >
                <Text style={styles.cancelButtonText}>
                  {config.cancelLabel || 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmButton,
                  config.confirmDestructive && styles.confirmDestructiveButton,
                ]}
                onPress={handleConfirm}
              >
                <Text style={[
                  styles.confirmButtonText,
                  config.confirmDestructive && styles.confirmDestructiveText,
                ]}>
                  {config.confirmLabel || 'Confirm'}
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 99998,
  },
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
  confirmContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#8c8c8c',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmDestructiveButton: {
    backgroundColor: '#ff444420',
    borderWidth: 1,
    borderColor: '#ff444450',
  },
  confirmDestructiveText: {
    color: '#ff4444',
  },
});

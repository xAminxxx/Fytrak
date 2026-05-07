import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Typography } from './Typography';
import * as Haptics from 'expo-haptics';

type Props = {
  onLog?: (amount: number) => void;
};

export function WaterTracker({ onLog }: Props) {
  const [ml, setMl] = useState(0);
  const target = 2500;
  const progress = Math.min(ml / target, 1);
  
  // Wave Animation
  const waveAnim = new Animated.Value(0);
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleAdd = (amount: number) => {
    setMl(prev => prev + amount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onLog) onLog(amount);
  };

  const waveTranslate = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
           <Ionicons name="water" size={18} color="#60a5fa" />
           <Typography variant="h2" style={{ fontSize: 18 }}>Hydration</Typography>
        </View>
        <Typography variant="label" color="#444">{ml} / {target} ml</Typography>
      </View>

      <View style={styles.trackArea}>
         <View style={styles.glass}>
            <View style={[styles.fill, { height: `${progress * 100}%` }]}>
               {/* Wave Overlay Placeholder */}
               <View style={styles.waveEffect} />
            </View>
            <View style={styles.glassOverlay}>
               <Typography variant="h2" style={{ color: progress > 0.5 ? '#fff' : '#444' }}>{Math.round(progress * 100)}%</Typography>
            </View>
         </View>

         <View style={styles.buttons}>
            <Pressable style={styles.btn} onPress={() => handleAdd(250)}>
               <Ionicons name="add" size={20} color="#fff" />
               <Text style={styles.btnText}>250ml</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: '#1c1c1e' }]} onPress={() => handleAdd(500)}>
               <Ionicons name="add" size={20} color="#fff" />
               <Text style={styles.btnText}>500ml</Text>
            </Pressable>
            <Pressable style={styles.resetBtn} onPress={() => setMl(0)}>
               <Ionicons name="refresh" size={16} color="#444" />
            </Pressable>
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1c1c1e',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  glass: {
    width: 80,
    height: 120,
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1c1c1e',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    backgroundColor: '#3b82f6',
  },
  waveEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: {
    flex: 1,
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  resetBtn: {
    alignSelf: 'flex-end',
    padding: 8,
  }
});

import React, { useState, useRef } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { OnboardingHeader } from '../../../components/OnboardingHeader';
import { Typography } from '../../../components/Typography';
import { PrimaryButton } from '../../../components/Button';

interface BodyMetricsStepProps {
  onNext: (data: { height: number; weight: number }) => void;
  onBack: () => void;
}

export function BodyMetricsStep({ onNext, onBack }: BodyMetricsStepProps) {
  const [userHeight, setUserHeight] = useState(160);
  const [userWeight, setUserWeight] = useState(60);

  const heightScale = useRef(new Animated.Value(1.1)).current; 
  const weightScale = useRef(new Animated.Value(0.9)).current;

  const heightPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const newVal = Math.max(100, Math.min(250, userHeight - gs.dy / 3));
        setUserHeight(Math.round(newVal));
        heightScale.setValue(0.7 + ((newVal - 100) / 150) * 0.9);
      },
    })
  ).current;

  const weightPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const newVal = Math.max(30, Math.min(200, userWeight + gs.dx / 3));
        setUserWeight(Math.round(newVal));
        weightScale.setValue(0.7 + ((newVal - 30) / 170) * 0.9);
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingHeader onBack={onBack} progress={60} />
      <View style={styles.content}>
        <Typography variant="h1">Your Physique</Typography>
        <Typography variant="subtitle" style={styles.sub}>Drag the head and body to match your physique.</Typography>

        <View style={styles.stage}>
          <View style={styles.labels}>
            <View style={styles.lBox}><Typography variant="label">Height</Typography><Typography variant="metric">{userHeight} cm</Typography></View>
            <View style={styles.lBox}><Typography variant="label">Weight</Typography><Typography variant="metric">{userWeight} kg</Typography></View>
          </View>

          <View style={styles.stickmanCenter}>
            <Animated.View style={[styles.stickman, { transform: [{ scaleY: heightScale }, { scaleX: weightScale }] }]}>
              <View style={styles.headGroup} {...heightPan.panHandlers}>
                <View style={styles.headRing} /><View style={styles.headDot} />
                <View style={styles.hDrag}><Ionicons name="resize" size={12} color="#000" /></View>
              </View>
              <View style={styles.bodyPart} {...weightPan.panHandlers}>
                <View style={styles.shoulders} /><View style={styles.neck} /><View style={styles.spine} />
                <View style={[styles.arm, styles.armL]} /><View style={[styles.arm, styles.armR]} />
                <View style={styles.wDrag}><Ionicons name="swap-horizontal" size={12} color="#000" /></View>
              </View>
              <View style={styles.legs}><View style={[styles.leg, styles.legL]} /><View style={[styles.leg, styles.legR]} /></View>
            </Animated.View>
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Confirm My Physique" icon="checkmark-circle" onPress={() => onNext({ height: userHeight, weight: userWeight })} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  sub: { marginTop: 5 },
  stage: { flex: 1, marginTop: 20, backgroundColor: '#050505', borderRadius: 30, borderWidth: 1, borderColor: '#111', overflow: 'hidden', alignItems: 'center' },
  labels: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', padding: 24 },
  lBox: { alignItems: 'center' },
  stickmanCenter: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  stickman: { alignItems: 'center' },
  headGroup: { alignItems: 'center', zIndex: 20, padding: 10 },
  headRing: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: colors.primary },
  headDot: { position: 'absolute', top: 30, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  hDrag: { position: 'absolute', top: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  bodyPart: { alignItems: 'center', width: 120, zIndex: 10 },
  neck: { width: 4, height: 12, backgroundColor: colors.primary },
  shoulders: { width: 80, height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  spine: { width: 4, height: 80, backgroundColor: colors.primary },
  arm: { position: 'absolute', width: 4, height: 60, backgroundColor: colors.primary },
  armL: { left: 20, transform: [{ rotate: '25deg' }] },
  armR: { right: 20, transform: [{ rotate: '-25deg' }] },
  wDrag: { position: 'absolute', top: 35, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#000' },
  legs: { flexDirection: 'row', gap: 30, marginTop: -2 },
  leg: { width: 4, height: 85, backgroundColor: colors.primary },
  legL: { transform: [{ rotate: '15deg' }] },
  legR: { transform: [{ rotate: '-15deg' }] },
  footer: { padding: 24, paddingBottom: 40 },
});

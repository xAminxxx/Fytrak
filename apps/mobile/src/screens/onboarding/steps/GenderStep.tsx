import React, { useState, useRef } from 'react';
import { View, StyleSheet, Animated, Pressable, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { OnboardingHeader } from '../../../components/OnboardingHeader';
import { Typography } from '../../../components/Typography';
import { PrimaryButton } from '../../../components/Button';

const { width } = Dimensions.get('window');

// Premium Athlete Assets (Centralized in branding assets)
const ATHLETE_MALE = require('../../../../assets/branding/raster/male.png');
const ATHLETE_FEMALE = require('../../../../assets/branding/raster/female.png');

interface GenderStepProps {
  onNext: (gender: string) => void;
  onBack: () => void;
}

export function GenderStep({ onNext, onBack }: GenderStepProps) {
  const [selected, setSelected] = useState<'male' | 'female' | null>(null);
  const scaleMale = useRef(new Animated.Value(1)).current;
  const scaleFemale = useRef(new Animated.Value(1)).current;

  const handleSelect = (gender: 'male' | 'female') => {
    setSelected(gender);
    const anim = gender === 'male' ? scaleMale : scaleFemale;
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingHeader onBack={onBack} progress={20} />

      <View style={styles.content}>
        <Typography variant="h1" style={styles.title}>What is Your Gender ?</Typography>

        <View style={styles.selectionContainer}>
          <Animated.View style={[styles.genderOption, { transform: [{ scale: scaleMale }] }]}>
            <Pressable
              style={styles.pressableArea}
              onPress={() => handleSelect('male')}
            >
              <View style={[
                styles.imageContainer,
                selected === 'male' && styles.imageContainerSelected
              ]}>
                <Image 
                  source={ATHLETE_MALE} 
                  style={[styles.athleteImage, selected !== 'male' && selected !== null && styles.dimmedImage]} 
                  resizeMode="contain" 
                />
              </View>
              <Typography 
                variant="h2" 
                style={selected === 'male' ? styles.genderLabelActive : styles.genderLabel}
              >
                Male
              </Typography>
            </Pressable>
          </Animated.View>

          <Animated.View style={[styles.genderOption, { transform: [{ scale: scaleFemale }] }]}>
            <Pressable
              style={styles.pressableArea}
              onPress={() => handleSelect('female')}
            >
              <View style={[
                styles.imageContainer,
                selected === 'female' && styles.imageContainerSelected
              ]}>
                <Image 
                  source={ATHLETE_FEMALE} 
                  style={[styles.athleteImage, selected !== 'female' && selected !== null && styles.dimmedImage]} 
                  resizeMode="contain" 
                />
              </View>
              <Typography 
                variant="h2" 
                style={selected === 'female' ? styles.genderLabelActive : styles.genderLabel}
              >
                Female
              </Typography>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton 
          title="Continue" 
          disabled={!selected} 
          onPress={() => selected && onNext(selected)} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, alignItems: 'center', paddingTop: 40 },
  title: { fontSize: 28, textAlign: 'center', marginBottom: 60, fontWeight: '700' },
  selectionContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    width: '100%',
    paddingHorizontal: 20,
    gap: 15
  },
  genderOption: {
    width: (width - 60) / 2,
    alignItems: 'center',
  },
  pressableArea: {
    width: '100%',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 320,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageContainerSelected: {
    borderColor: 'rgba(255, 230, 0, 0.3)', // Subtle yellow glow
  },
  athleteImage: {
    width: '100%',
    height: '100%',
  },
  dimmedImage: {
    opacity: 0.4,
  },
  genderLabel: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
  },
  genderLabelActive: {
    color: colors.primary,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 50 },
});

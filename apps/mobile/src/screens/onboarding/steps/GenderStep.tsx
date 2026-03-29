import React, { useState, useRef } from 'react';
import { View, StyleSheet, Animated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { OnboardingHeader } from '../../../components/OnboardingHeader';
import { Typography } from '../../../components/Typography';
import { PrimaryButton } from '../../../components/Button';

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
      Animated.timing(anim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingHeader onBack={onBack} progress={20} />

      <View style={styles.content}>
        <Typography variant="h1">What's your gender?</Typography>
        <Typography variant="subtitle" style={styles.subtitle}>
          Help us tailor your fitness journey to your body type.
        </Typography>

        <View style={styles.selectionContainer}>
          <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleMale }] }]}>
            <Pressable
              style={[styles.card, selected === 'male' && styles.cardSelected]}
              onPress={() => handleSelect('male')}
            >
              <View style={[styles.iconBox, selected === 'male' && styles.iconBoxSelected]}>
                <Ionicons name="male" size={54} color={selected === 'male' ? colors.primary : '#333'} />
              </View>
              <Typography variant="h2" color={selected === 'male' ? colors.primary : '#444'}>Male</Typography>
            </Pressable>
          </Animated.View>

          <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleFemale }] }]}>
            <Pressable
              style={[styles.card, selected === 'female' && styles.cardSelected]}
              onPress={() => handleSelect('female')}
            >
              <View style={[styles.iconBox, selected === 'female' && styles.iconBoxSelected]}>
                <Ionicons name="female" size={54} color={selected === 'female' ? colors.primary : '#333'} />
              </View>
              <Typography variant="h2" color={selected === 'female' ? colors.primary : '#444'}>Female</Typography>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton 
          title="Continue" 
          icon="arrow-forward" 
          disabled={!selected} 
          onPress={() => selected && onNext(selected)} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 40 },
  subtitle: { marginTop: 12 },
  selectionContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 40, gap: 20 },
  cardWrapper: { flex: 1 },
  card: { height: 260, backgroundColor: '#161616', borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', gap: 20 },
  cardSelected: { borderColor: colors.primary, backgroundColor: '#1a1a10' },
  iconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  iconBoxSelected: { backgroundColor: '#22251a' },
  footer: { padding: 24, paddingBottom: 40 },
});

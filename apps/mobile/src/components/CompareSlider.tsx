import React, { useState, useRef } from 'react';
import { StyleSheet, View, Image, PanResponder, Animated, Text, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface CompareSliderProps {
  beforeUri: string;
  afterUri: string;
  onClose: () => void;
  beforeDate?: string;
  afterDate?: string;
}

export function CompareSlider({ beforeUri, afterUri, onClose, beforeDate, afterDate }: CompareSliderProps) {
  const screenWidth = Dimensions.get('window').width;
  const [sliderPosition] = useState(new Animated.Value(screenWidth / 2));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newPos = Math.max(0, Math.min(screenWidth, gestureState.moveX));
        sliderPosition.setValue(newPos);
      },
    })
  ).current;

  const leftWidth = sliderPosition;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.title}>PROGRESS COMPARISON</Text>
      </View>

      <View style={styles.sliderContainer}>
        {/* AFTER IMAGE (Background) */}
        <Image 
          source={{ uri: afterUri }} 
          style={styles.image} 
          resizeMode="cover"
        />

        {/* BEFORE IMAGE (Foreground with dynamic width) */}
        <Animated.View style={[styles.beforeContainer, { width: leftWidth }]}>
          <Image 
            source={{ uri: beforeUri }} 
            style={[styles.image, { width: screenWidth }]} 
            resizeMode="cover"
          />
        </Animated.View>

        {/* SLIDER HANDLE */}
        <Animated.View 
          style={[styles.handleContainer, { left: Animated.subtract(sliderPosition, 20) }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleLine} />
          <View style={styles.handleCircle}>
            <Ionicons name="swap-horizontal" size={24} color="#000" />
          </View>
        </Animated.View>

        {/* LABELS */}
        <View style={styles.labelContainer}>
          <View style={styles.labelWrapper}>
            <Text style={styles.labelText}>BEFORE</Text>
            {beforeDate && <Text style={styles.dateText}>{beforeDate}</Text>}
          </View>
          <View style={[styles.labelWrapper, { alignItems: 'flex-end' }]}>
            <Text style={styles.labelText}>AFTER</Text>
            {afterDate && <Text style={styles.dateText}>{afterDate}</Text>}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  closeBtn: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  title: {
    color: colors.primary,
    fontFamily: 'Adcure',
    fontSize: 20,
    letterSpacing: 2,
  },
  sliderContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
  },
  beforeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    overflow: 'hidden',
    borderRightWidth: 2,
    borderRightColor: colors.primary,
  },
  handleContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  handleLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: colors.primary,
  },
  handleCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  labelContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  labelWrapper: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  labelText: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  dateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});

import { View, Text, StyleSheet, Image, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '../../components/Branding';
import { colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.container}>
      {/* BACKGROUND IMAGE - GRITTY GYM AESTHETIC */}
      <Image
        source={require('../../../assets/branding/welcome_bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* GRADIENT OVERLAY */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.content}>
        <View style={styles.topSection}>
          <AppLogo width={width * 0.8} height={200} />
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.tagline}>TRANSFORM YOUR BODY</Text>
          <Text style={styles.subtext}>A professional companion for your fitness journey.</Text>

          <Pressable style={styles.button} onPress={onStart}>
            <Text style={styles.buttonText}>Get started</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 100, // Move logo lower
  },
  bottomSection: {
    gap: 16,
    paddingBottom: 40,
  },
  tagline: {
    fontFamily: 'Adcure', // Brand font
    color: colors.primary, // Brand yellow
    fontSize: 32,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtext: {
    color: '#333', // Dark grey/black subtext
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.primary,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

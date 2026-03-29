import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import * as Haptics from 'expo-haptics';

interface ProgressCameraProps {
  onCapture: (uri: string) => void;
  onClose: () => void;
  overlayUri?: string;
}

export function ProgressCamera({ onCapture, onClose, overlayUri }: ProgressCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.2);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        shutterSound: true,
      });
      if (photo) onCapture(photo.uri);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        ref={cameraRef} 
        style={styles.camera} 
        facing={facing}
        onMountError={(e) => console.error("Camera mount error:", e)}
      >
        {overlayUri && (
          <Image 
            source={{ uri: overlayUri }} 
            style={[styles.overlay, { opacity: overlayOpacity }]} 
            resizeMode="cover"
          />
        )}

        <View style={styles.controls}>
          <View style={styles.topRow}>
            <Pressable style={styles.iconBtn} onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            
            {overlayUri && (
              <View style={styles.opacityControl}>
                <Pressable onPress={() => setOverlayOpacity(Math.max(0, overlayOpacity - 0.1))}>
                  <Ionicons name="remove-circle-outline" size={24} color="#fff" />
                </Pressable>
                <Text style={styles.opacityText}>{Math.round(overlayOpacity * 100)}%</Text>
                <Pressable onPress={() => setOverlayOpacity(Math.min(1, overlayOpacity + 0.1))}>
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                </Pressable>
              </View>
            )}

            <Pressable style={styles.iconBtn} onPress={() => setFacing(p => p === 'back' ? 'front' : 'back')}>
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.shutterContainer}>
              <Pressable 
                style={styles.shutterBtn} 
                onPress={takePicture}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 30,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  bottomRow: {
    marginBottom: 20,
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
  },
  message: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
  },
  btnText: {
    color: '#000',
    fontWeight: 'bold',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  opacityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 10,
  },
  opacityText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
    width: 40,
    textAlign: 'center',
  },
});

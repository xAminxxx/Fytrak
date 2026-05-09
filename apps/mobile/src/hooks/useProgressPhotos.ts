/**
 * useProgressPhotos — Subscribes to progress photos and provides CRUD handlers.
 * Extracts photo management logic from ProgressScreen.
 */
import { useCallback, useState, useEffect } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  subscribeToProgressPhotos,
  saveProgressPhoto,
  deleteProgressPhoto,
  type ProgressPhoto,
} from "../services/profileService";
import { uploadProgressPhoto } from "../services/cloudinaryUpload";
import { useCurrentUser } from "./useCurrentUser";
import { toLocalDateKey } from "../utils/dateKeys";

export function useProgressPhotos() {
  const uid = useCurrentUser();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToProgressPhotos(uid, setPhotos);
    return unsubscribe;
  }, [uid]);

  const handleCapture = useCallback(async (uri: string) => {
    if (!uid) return;
    try {
      setIsSaving(true);
      const result = await uploadProgressPhoto(uri);
      await saveProgressPhoto(uid, {
        url: result.secureUrl,
        date: toLocalDateKey(),
        type: "front",
      });
      Alert.alert("Success", "Transformation photo saved!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to upload photo.");
    } finally {
      setIsSaving(false);
    }
  }, [uid]);

  const handlePickFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      handleCapture(result.assets[0].uri);
    }
  }, [handleCapture]);

  const handlePickPhoto = useCallback(() => {
    Alert.alert("Track Progress", "Select capture mode", [
      { text: "Camera (Ghost Overlay)", onPress: () => {} }, // caller handles camera visibility
      { text: "Import from Gallery", onPress: handlePickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handlePickFromLibrary]);

  const handleDeleteSelected = useCallback(async (selectedIds: string[]) => {
    if (!uid || selectedIds.length === 0) return;

    Alert.alert("Delete Photos", `Delete ${selectedIds.length} photos?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSaving(true);
            for (const id of selectedIds) await deleteProgressPhoto(uid, id);
          } catch (error) {
            console.error(error);
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  }, [uid]);

  return {
    photos,
    isSaving,
    handleCapture,
    handlePickFromLibrary,
    handlePickPhoto,
    handleDeleteSelected,
  };
}

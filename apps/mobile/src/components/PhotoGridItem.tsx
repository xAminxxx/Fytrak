import React, { memo } from "react";
import { View, StyleSheet, Pressable, Image, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { type ProgressPhoto } from "../services/userSession";

const HighPerfImage = memo(({ url }: { url: string }) => (
  <Image
    source={{ uri: url }}
    style={styles.gridPhoto}
    resizeMode="cover"
    fadeDuration={0}
  />
), (prev, next) => prev.url === next.url);

interface PhotoGridItemProps {
  photo: ProgressPhoto;
  isSelected: boolean;
  isSelectionMode: boolean;
  isCompareMode: boolean;
  isCompareSelected: boolean;
  onSelect: (p: ProgressPhoto) => void;
  onView: (url: string) => void;
  onLongPress: (p: ProgressPhoto) => void;
  width: number;
}

export const PhotoGridItem = memo(({
  photo,
  isSelected,
  isSelectionMode,
  isCompareMode,
  isCompareSelected,
  onSelect,
  onView,
  onLongPress,
  width
}: PhotoGridItemProps) => {
  return (
    <Pressable
      style={[styles.gridPhotoBox, { width, height: width }]}
      onPress={() => (isSelectionMode || isCompareMode) ? onSelect(photo) : onView(photo.url)}
      onLongPress={() => onLongPress(photo)}
      delayLongPress={300}
    >
      <HighPerfImage url={photo.url} />

      {(isSelected || isCompareSelected) && (
        <View style={[styles.selectionBorderOverlay, isCompareSelected && { borderColor: colors.primary }]}>
          <View style={styles.deleteOverlay}>
            <Ionicons name={isCompareSelected ? "checkmark-circle" : "trash"} size={24} color="#fff" />
          </View>
        </View>
      )}

      {isCompareSelected && (
        <View style={styles.badgeLabel}>
          <Text style={styles.badgeText}>COMPARE</Text>
        </View>
      )}

      {!isSelectionMode && !isCompareMode && (
        <View style={styles.gridDateTag}>
          <Text style={styles.gridDateText}>
            {new Date(photo.date).toLocaleDateString([], { month: "short", day: "numeric" })}
          </Text>
        </View>
      )}
    </Pressable>
  );
}, (prev, next) => {
  return prev.isSelected === next.isSelected &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isCompareMode === next.isCompareMode &&
    prev.isCompareSelected === next.isCompareSelected &&
    prev.photo.url === next.photo.url &&
    prev.width === next.width;
});

const styles = StyleSheet.create({
  gridPhotoBox: { 
    borderRadius: 12, 
    overflow: "hidden", 
    backgroundColor: "#1c1c1e" 
  },
  gridPhoto: { 
    width: "100%", 
    height: "100%" 
  },
  selectionBorderOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    borderColor: "#ff4444", 
    borderWidth: 3, 
    borderRadius: 12, 
    backgroundColor: "rgba(255, 68, 68, 0.2)" 
  },
  deleteOverlay: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  gridDateTag: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: "rgba(0,0,0,0.7)", 
    paddingVertical: 4 
  },
  gridDateText: { 
    color: "#fff", 
    fontSize: 8, 
    fontWeight: "900", 
    textAlign: "center" 
  },
  badgeLabel: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    backgroundColor: colors.primary, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  badgeText: { 
    color: '#000', 
    fontSize: 8, 
    fontWeight: '900' 
  },
});

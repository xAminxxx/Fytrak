import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../../components/Typography";
import { colors } from "../../../theme/colors";
import { spacing, radius } from "../../../theme/tokens";
import { toSafeDate } from "../../../utils/chartFilters";

type VisualCheckInCardProps = {
  todayPhoto?: { url: string; createdAt: any };
  onViewPhoto: (url: string) => void;
};

export function VisualCheckInCard({ todayPhoto, onViewPhoto }: VisualCheckInCardProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
          <Ionicons name="camera" size={14} color={colors.success} />
        </View>
        <Typography variant="label" color={colors.success} style={styles.title}>VISUAL CHECK-IN</Typography>
      </View>

      {todayPhoto ? (
        <View style={styles.card}>
          <Pressable onPress={() => onViewPhoto(todayPhoto.url)}>
            <Image source={{ uri: todayPhoto.url }} style={styles.image} resizeMode="cover" />
          </Pressable>
          <View style={styles.meta}>
            <Typography variant="label" color={colors.textFaint}>
              Today's snapshot logged at {toSafeDate(todayPhoto.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Typography variant="label" color={colors.textDim}>No progress photo logged today</Typography>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  iconBox: { width: 26, height: 26, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  card: { backgroundColor: colors.surfaceMuted, borderRadius: radius["2xl"], padding: spacing.xl, borderWidth: 1, borderColor: colors.borderStrong },
  image: { width: '100%', height: 240, borderRadius: radius.lg, backgroundColor: colors.bgDark },
  meta: { marginTop: spacing.md, alignItems: 'center' },
  emptyCard: { backgroundColor: colors.bgDark, borderRadius: radius.xl, padding: spacing["3xl"], alignItems: 'center', borderWidth: 1, borderColor: colors.borderSubtle, borderStyle: 'dashed' },
});

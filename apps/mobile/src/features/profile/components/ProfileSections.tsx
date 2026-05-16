import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../../../theme/colors";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { UserProfile } from "../../../services/userSession";
import type { ProfileChartPoint } from "../hooks/useProfileOverview";
import { TrendChart } from "../../../components/TrendChart";

type IconName = keyof typeof Ionicons.glyphMap;

export function ProfileHero({
  profile,
  name,
  streakDays,
  weeklyWorkouts,
  totalVolume,
  isEditingName,
  onNameChange,
  onSaveName,
  onEditName,
  onPickImage,
}: {
  profile: UserProfile | null;
  name: string;
  streakDays: number;
  weeklyWorkouts: number;
  totalVolume: number;
  isEditingName: boolean;
  onNameChange: (value: string) => void;
  onSaveName: () => void;
  onEditName: () => void;
  onPickImage: () => void;
}) {
  const initials = (profile?.name || "F").slice(0, 1).toUpperCase();
  const coachStatus = profile?.selectedCoachName ? `Coached by ${profile.selectedCoachName}` : "Independent athlete";

  return (
    <View style={styles.hero}>
      <View style={styles.heroAmbientOne} />
      <View style={styles.heroAmbientTwo} />
      <View style={styles.heroHeaderRow}>
        <Text style={styles.heroEyebrow}>Athlete identity</Text>
        <View style={styles.liveStatus}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{profile?.isPremium ? "Premium" : "Active"}</Text>
        </View>
      </View>

      <Pressable style={styles.avatarButton} onPress={onPickImage} accessibilityRole="button" accessibilityLabel="Update profile photo">
        <View style={styles.avatarHaloOuter} />
        <View style={styles.avatarHaloInner} />
        {profile?.profileImageUrl ? (
          <Image source={{ uri: profile.profileImageUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
        )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color={colors.primaryText} />
          </View>
      </Pressable>

      <View style={styles.identityBlock}>
        {isEditingName ? (
          <TextInput
            value={name}
            onChangeText={onNameChange}
            onSubmitEditing={onSaveName}
            onBlur={onSaveName}
            autoFocus
            style={styles.nameInput}
            placeholder="Your name"
            placeholderTextColor={colors.textDim}
          />
        ) : (
          <Pressable onPress={onEditName} style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.nameText}>{profile?.name || "Fytrak Athlete"}</Text>
            <View style={styles.editBubble}>
              <Ionicons name="create-outline" size={14} color={colors.primary} />
            </View>
          </Pressable>
        )}

        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{profile?.role === "coach" ? "Coach" : "Athlete"}</Text>
          </View>
          <View style={styles.roleBadgeMuted}>
            <Text style={styles.roleBadgeMutedText}>{profile?.level || "Building base"}</Text>
          </View>
        </View>

        <View style={styles.coachPill}>
          <Ionicons name={profile?.selectedCoachName ? "shield-checkmark" : "person"} size={14} color={colors.primary} />
          <Text numberOfLines={1} style={styles.coachText}>{coachStatus}</Text>
        </View>

        <View style={styles.embeddedSocialRow}>
          <SocialAction icon="logo-instagram" label="Instagram" compact />
          <SocialAction icon="logo-youtube" label="YouTube" compact />
          <SocialAction icon="logo-tiktok" label="TikTok" compact />
          <SocialAction icon="link-outline" label="Link" compact />
        </View>
      </View>

      <View style={styles.heroProofStrip}>
        <HeroProof value={`${streakDays}`} label="Streak" />
        <View style={styles.heroProofDivider} />
        <HeroProof value={`${weeklyWorkouts}`} label="This week" />
        <View style={styles.heroProofDivider} />
        <HeroProof value={formatVolume(totalVolume)} label="Volume" />
      </View>
    </View>
  );
}

export function ProfileSignalGrid({
  streakDays,
  weeklyWorkouts,
  workoutsCount,
  totalVolume,
}: {
  streakDays: number;
  weeklyWorkouts: number;
  workoutsCount: number;
  totalVolume: number;
}) {
  const streakProgress = Math.min(1, Math.max(0.08, streakDays / 7));
  return (
    <View style={styles.momentumSurface}>
      <View style={styles.momentumHero}>
        <ProgressRing progress={streakProgress} size={118} stroke={8} />
        <View style={styles.ringCenter}>
          <Text style={styles.ringValue}>{streakDays}</Text>
          <Text style={styles.ringLabel}>day streak</Text>
        </View>
      </View>

      <View style={styles.momentumCopy}>
        <Text style={styles.sectionLabel}>Momentum</Text>
        <Text style={styles.momentumTitle}>Consistency engine</Text>
        <Text style={styles.momentumBody}>
          {streakDays > 0 ? "Your rhythm is active. Keep the chain alive today." : "Start a streak and make the profile feel earned."}
        </Text>
        <View style={styles.miniSignalRow}>
          <MiniSignal value={`${weeklyWorkouts}`} label="week" />
          <MiniSignal value={`${workoutsCount}`} label="sessions" />
          <MiniSignal value={formatVolume(totalVolume)} label="volume" />
        </View>
      </View>
    </View>
  );
}

export function ProfileBioSection({
  bio,
  isEditing,
  value,
  onChange,
  onEdit,
  onSave,
}: {
  bio?: string;
  isEditing: boolean;
  value: string;
  onChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  const displayBio = bio?.trim() || "No athlete statement yet. Add a short line that captures your goal, discipline, or training identity.";

  return (
    <View style={styles.bioPanel}>
      <View style={styles.bioHeader}>
        <View>
          <Text style={styles.bioEyebrow}>Athlete statement</Text>
          <Text style={styles.bioTitle}>Your training identity</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.bioEditButton, pressed && styles.pressed]}
          onPress={isEditing ? onSave : onEdit}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? "Save bio" : "Edit bio"}
        >
          <Text style={styles.bioEditText}>{isEditing ? "Save" : "Edit"}</Text>
        </Pressable>
      </View>

      {isEditing ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          onBlur={onSave}
          autoFocus
          multiline
          maxLength={140}
          placeholder="Example: Building strength, discipline, and a physique I am proud of."
          placeholderTextColor={colors.textDim}
          style={styles.bioInput}
        />
      ) : (
        <Text style={[styles.bioText, !bio?.trim() && styles.bioTextEmpty]}>{displayBio}</Text>
      )}
    </View>
  );
}

export function ProfileSocialBar() {
  return (
    <View style={styles.socialBar}>
      <SocialAction icon="logo-instagram" label="Instagram" />
      <SocialAction icon="logo-youtube" label="YouTube" />
      <SocialAction icon="logo-tiktok" label="TikTok" />
      <SocialAction icon="link-outline" label="Link" />
    </View>
  );
}

export function ProfileProgressPanel({
  chartData,
  completionPercent,
  goal,
}: {
  chartData: ProfileChartPoint[];
  completionPercent: number;
  goal?: string;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.sectionLabel}>Transformation signal</Text>
          <Text style={styles.panelTitle}>Training momentum</Text>
        </View>
        <View style={styles.completionPill}>
          <Text style={styles.completionText}>{completionPercent}% profile</Text>
        </View>
      </View>

      <View style={styles.completionTrack}>
        <View style={[styles.completionBar, { width: `${completionPercent}%` }]} />
      </View>

      <TrendChart data={chartData} color={colors.primary} height={128} emptyLabel="Log workouts to build your training signal" />

      <View style={styles.goalRow}>
        <View style={styles.goalIcon}>
          <Ionicons name="flag" size={18} color={colors.primary} />
        </View>
        <View style={styles.goalTextBlock}>
          <Text style={styles.goalLabel}>Current goal</Text>
          <Text numberOfLines={2} style={styles.goalValue}>{formatGoal(goal)}</Text>
        </View>
      </View>
    </View>
  );
}

export function ProfileNextMove({
  profile,
  completionPercent,
}: {
  profile: UserProfile | null;
  completionPercent: number;
}) {
  const title = completionPercent < 100 ? "Complete your athlete profile" : "Keep the streak alive";
  const body = completionPercent < 100
    ? "A complete profile gives your coach better context and makes Fytrak feel more personal."
    : "Your profile foundation is strong. Use the next workout to reinforce the transformation loop.";

  return (
    <View style={styles.nextMove}>
      <View style={styles.nextMoveIcon}>
        <Ionicons name={completionPercent < 100 ? "sparkles" : "checkmark-done"} size={22} color={colors.primary} />
      </View>
      <View style={styles.nextMoveContent}>
        <Text style={styles.nextMoveTitle}>{title}</Text>
        <Text style={styles.nextMoveBody}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
    </View>
  );
}

export function ProfileAccountPanel({
  profile,
  onPickImage,
  onEditName,
  onLogout,
}: {
  profile: UserProfile | null;
  onPickImage: () => void;
  onEditName: () => void;
  onLogout: () => void;
}) {
  return (
    <View style={styles.accountPanel}>
      <ActionRow icon="person-circle-outline" title="Edit identity" subtitle="Name and profile photo" onPress={onEditName} />
      <ActionRow icon="image-outline" title="Update photo" subtitle="Keep your transformation identity current" onPress={onPickImage} />
      <ActionRow
        icon="shield-checkmark-outline"
        title="Coach status"
        subtitle={profile?.selectedCoachName ? `Connected to ${profile.selectedCoachName}` : "No coach connected yet"}
      />
      <Pressable style={[styles.actionRow, styles.logoutRow]} onPress={onLogout}>
        <View style={[styles.actionIcon, styles.logoutIcon]}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={[styles.actionTitle, styles.logoutText]}>Sign out</Text>
          <Text style={styles.actionSubtitle}>Close this Fytrak session</Text>
        </View>
      </Pressable>
    </View>
  );
}

function ProgressRing({ progress, size, stroke }: { progress: number; size: number; stroke: number }) {
  const radiusValue = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const dashOffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size} style={styles.ringSvg}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radiusValue}
        stroke={colors.bg}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radiusValue}
        stroke={colors.primary}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        rotation="-90"
        originX={size / 2}
        originY={size / 2}
      />
    </Svg>
  );
}

function MiniSignal({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.miniSignal}>
      <Text style={styles.miniSignalValue}>{value}</Text>
      <Text style={styles.miniSignalLabel}>{label}</Text>
    </View>
  );
}

function HeroProof({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroProof}>
      <Text style={styles.heroProofValue}>{value}</Text>
      <Text style={styles.heroProofLabel}>{label}</Text>
    </View>
  );
}

function SocialAction({ icon, label, compact }: { icon: IconName; label: string; compact?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.socialAction, compact && styles.socialActionCompact, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

function ActionRow({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.actionRow, pressed && onPress && styles.pressed]} onPress={onPress} disabled={!onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textDim} /> : null}
    </Pressable>
  );
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}m`;
  if (volume >= 1000) return `${Math.round(volume / 1000)}k`;
  return `${Math.round(volume)}`;
}

function formatGoal(goal?: string): string {
  if (!goal || goal === "Not set") return "Set a clear transformation goal";
  return goal.replace(/_/g, " ");
}

const styles = StyleSheet.create({
  hero: {
    position: "relative",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: 32,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: "#2c2c24",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.22,
        shadowRadius: 22,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heroAmbientOne: {
    position: "absolute",
    top: -72,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary,
    opacity: 0.08,
  },
  heroAmbientTwo: {
    position: "absolute",
    right: -80,
    bottom: -90,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.info,
    opacity: 0.05,
  },
  heroHeaderRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  heroEyebrow: {
    ...typography.label,
    color: colors.textDim,
  },
  liveStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  avatarButton: {
    position: "relative",
    width: 86,
    height: 86,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHaloOuter: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: "rgba(255,204,0,0.18)",
  },
  avatarHaloInner: {
    position: "absolute",
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: "rgba(255,204,0,0.07)",
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarFallback: {
    width: 86,
    height: 86,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarInitial: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surfaceMuted,
  },
  identityBlock: {
    width: "100%",
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: "center",
  },
  roleBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  roleBadgeText: {
    ...typography.label,
    color: colors.primaryText,
  },
  roleBadgeMuted: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  roleBadgeMutedText: {
    ...typography.label,
    color: colors.textMuted,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  nameText: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    textAlign: "center",
    maxWidth: 245,
  },
  nameInput: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 0,
    minWidth: 180,
    textAlign: "center",
  },
  editBubble: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryMuted,
  },
  coachText: {
    color: colors.textMuted,
    ...typography.bodySmall,
    flexShrink: 1,
  },
  coachPill: {
    marginTop: spacing.md,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  embeddedSocialRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroProofStrip: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  heroProof: {
    flex: 1,
    alignItems: "center",
  },
  heroProofValue: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900",
  },
  heroProofLabel: {
    color: colors.textDim,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroProofDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderSubtle,
  },
  bioPanel: {
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  bioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  bioEyebrow: {
    ...typography.label,
    color: colors.primary,
  },
  bioTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  bioEditButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  bioEditText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  bioText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  bioTextEmpty: {
    color: colors.textMuted,
  },
  bioInput: {
    minHeight: 84,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    textAlignVertical: "top",
  },
  momentumSurface: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: 30,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
  },
  momentumHero: {
    width: 126,
    height: 126,
    alignItems: "center",
    justifyContent: "center",
  },
  ringSvg: {
    position: "absolute",
  },
  ringCenter: {
    alignItems: "center",
  },
  ringValue: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  ringLabel: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  momentumCopy: {
    flex: 1,
  },
  momentumTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  momentumBody: {
    color: colors.textMuted,
    ...typography.bodySmall,
    marginTop: spacing.sm,
  },
  miniSignalRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  miniSignal: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.lg,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  miniSignalValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  miniSignalLabel: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  socialBar: {
    flexDirection: "row",
    alignSelf: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: -spacing.sm,
  },
  socialAction: {
    width: 48,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  socialActionCompact: {
    width: 40,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  panel: {
    borderRadius: 30,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  completionTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  completionBar: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.primary,
  },
  panelTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    ...typography.heading,
  },
  completionPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  completionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  goalRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryMuted,
  },
  goalTextBlock: {
    flex: 1,
    marginLeft: spacing.md,
  },
  goalLabel: {
    ...typography.label,
    color: colors.textDim,
  },
  goalValue: {
    marginTop: spacing.xs,
    color: colors.text,
    ...typography.body,
  },
  nextMove: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: 30,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  nextMoveIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryMuted,
  },
  nextMoveContent: {
    flex: 1,
  },
  nextMoveTitle: {
    color: colors.text,
    ...typography.heading,
  },
  nextMoveBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    ...typography.bodySmall,
  },
  accountPanel: {
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  actionCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  actionSubtitle: {
    marginTop: spacing.xxs,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  logoutRow: {
    borderBottomWidth: 0,
  },
  logoutIcon: {
    backgroundColor: colors.dangerMuted,
  },
  logoutText: {
    color: colors.danger,
  },
});

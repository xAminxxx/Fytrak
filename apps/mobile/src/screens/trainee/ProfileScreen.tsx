import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { logOut } from "../../services/auth";

import { auth } from "../../config/firebase";
import { saveUserRole, subscribeToUserProfile, type UserProfile, saveAssignmentStatus, saveUserProfile } from "../../services/userSession";

import { SessionState } from "../../state/types";

export function ProfileScreen({ session }: { session: SessionState }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = subscribeToUserProfile(user.uid, (data) => {
      setProfile(data);
      setTempGoal(data.goal || "");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => void logOut() },
    ]);
  };

  const handleUpdateGoal = async () => {
    if (!auth.currentUser || !tempGoal.trim()) return;
    try {
      await saveUserProfile(auth.currentUser.uid, { goal: tempGoal.trim() });
      setIsEditingGoal(false);
    } catch (e) {
      Alert.alert("Error", "Could not update goal.");
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      "End Relation",
      `Are you sure you want to disconnect from ${session.selectedCoachName || "your coach"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            if (auth.currentUser) {
              await saveAssignmentStatus(auth.currentUser.uid, "unassigned");
            }
          }
        },
      ]
    );
  };

  const handleSwitchRole = async (currentRole: string) => {
    const newRole = currentRole === "trainee" ? "coach" : "trainee";
    const title = currentRole === "trainee" ? "Become a Coach?" : "Back to Trainee?";
    const msg = currentRole === "trainee"
      ? "You will be able to manage clients and review their logs."
      : "You will be able to log your own workouts and find a coach.";

    Alert.alert(title, msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Switch",
        onPress: async () => {
          if (!auth.currentUser) return;
          try {
            setIsSwitching(true);
            await saveUserRole(auth.currentUser.uid, newRole);
          } catch (e) {
            Alert.alert("Error", "Failed to switch role.");
          } finally {
            setIsSwitching(false);
          }
        }
      },
    ]);
  };

  return (
    <ScreenShell
      title="Profile"
      subtitle="Goals, notifications, and account settings"
      contentStyle={styles.shellContent}
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Text style={styles.label}>Training Goal</Text>
              <Pressable onPress={() => isEditingGoal ? handleUpdateGoal() : setIsEditingGoal(true)}>
                <Text style={styles.editBtnText}>{isEditingGoal ? "SAVE" : "EDIT"}</Text>
              </Pressable>
            </View>
            <View style={styles.goalDisplay}>
              {isEditingGoal ? (
                <TextInput
                  style={styles.goalInput}
                  value={tempGoal}
                  onChangeText={setTempGoal}
                  autoFocus
                />
              ) : (
                <Text style={styles.goalText}>{profile?.goal || "Not set"}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable
            style={styles.actionRow}
            onPress={() => setNotificationsEnabled((prev) => !prev)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="notifications" size={20} color={colors.primary} />
              <Text style={styles.rowLabel}>Coach notifications</Text>
            </View>
            <View style={[styles.toggle, notificationsEnabled && styles.toggleActive]}>
              <View style={[styles.toggleCircle, notificationsEnabled && styles.toggleCircleActive]} />
            </View>
          </Pressable>

          <Pressable style={styles.actionRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="lock-closed" size={20} color="#8c8c8c" />
              <Text style={styles.rowLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </Pressable>

          <View style={styles.divider} />

          {session.role === "trainee" && (
            <>
              <View style={styles.coachSection}>
                <Text style={styles.sectionLabel}>YOUR COACH</Text>
                {session.selectedCoachId ? (
                  <View style={styles.coachRow}>
                    <View style={styles.coachAvatar}>
                      <Text style={styles.avatarText}>{session.selectedCoachName?.[0] || "C"}</Text>
                    </View>
                    <View style={styles.coachInfo}>
                      <Text style={styles.coachName}>{session.selectedCoachName}</Text>
                      <Text style={styles.coachStatus}>Assigned</Text>
                    </View>
                    <Pressable style={styles.disconnectBtn} onPress={handleDisconnect}>
                      <Text style={styles.disconnectText}>End Relation</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.noCoachBtn}
                    onPress={() => Alert.alert("No Coach", "Go to the Coaching tab to find a professional coach.")}
                  >
                    <Text style={styles.noCoachText}>No coach assigned yet</Text>
                    <Ionicons name="search" size={16} color={colors.primary} />
                  </Pressable>
                )}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {session.role === "coach" && profile?.coachProfile && (
            <>
              <View style={styles.coachSection}>
                <Text style={styles.sectionLabel}>PROFESSIONAL PROFILE</Text>
                <View style={styles.coachProfileBox}>
                  <Text style={styles.bioText} numberOfLines={3}>{profile.coachProfile.bio}</Text>
                  <View style={styles.specRow}>
                    {profile.coachProfile.specialties.slice(0, 3).map(s => (
                      <View key={s} style={styles.specPill}>
                        <Text style={styles.specPillText}>{s}</Text>
                      </View>
                    ))}
                    {profile.coachProfile.specialties.length > 3 && (
                      <Text style={styles.plusMore}>+{profile.coachProfile.specialties.length - 3} more</Text>
                    )}
                  </View>
                  <Text style={styles.expText}>Exp: {profile.coachProfile.experience}</Text>
                </View>
              </View>
              <View style={styles.divider} />
            </>
          )}

          <View style={styles.roleSection}>
            <Text style={styles.sectionLabel}>ACCOUNT TYPE</Text>
            <Pressable
              style={[styles.roleCard, isSwitching && { opacity: 0.6 }]}
              onPress={() => handleSwitchRole(session.role)}
              disabled={isSwitching}
            >
              <View style={styles.roleInfo}>
                <View style={styles.roleIconBox}>
                  <Ionicons name={session.role === "trainee" ? "person" : "fitness"} size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.roleName}>
                    {session.role === "trainee" ? "Trainee Mode" : "Coach Mode"}
                  </Text>
                  <Text style={styles.roleSub}>Tap to switch account type</Text>
                </View>
              </View>
              <Ionicons name="swap-horizontal" size={20} color="#444" />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    paddingBottom: 100,
  },
  loader: {
    padding: 40,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333333",
    gap: 16,
    marginTop: 10,
  },
  inputGroup: {
    gap: 8,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#8c8c8c",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  goalDisplay: {
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    minHeight: 54,
    justifyContent: "center",
  },
  goalText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  goalInput: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  iconWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#333",
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  toggleCircleActive: {
    alignSelf: "flex-end",
  },
  logoutButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: {
    color: "#ff4444",
    fontWeight: "700",
    fontSize: 16,
  },
  coachSection: {
    paddingVertical: 10,
  },
  sectionLabel: {
    color: "#8c8c8c",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },
  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  coachAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primaryText,
    fontWeight: "800",
    fontSize: 16,
  },
  coachInfo: {
    flex: 1,
    marginLeft: 12,
  },
  coachName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  coachStatus: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  disconnectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2c2c2e",
  },
  disconnectText: {
    color: "#ff4444",
    fontSize: 12,
    fontWeight: "700",
  },
  noCoachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  noCoachText: {
    color: "#8c8c8c",
    fontSize: 14,
    fontWeight: "600",
  },
  roleSection: {
    paddingVertical: 10,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    justifyContent: "space-between",
  },
  roleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2c2c2e",
    alignItems: "center",
    justifyContent: "center",
  },
  roleName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  roleSub: {
    color: "#8c8c8c",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  coachProfileBox: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 12,
  },
  bioText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  specRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  specPill: {
    backgroundColor: "#2c2c2e",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  specPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  plusMore: {
    color: "#8c8c8c",
    fontSize: 11,
    fontWeight: "600",
  },
  expText: {
    color: "#8c8c8c",
    fontSize: 12,
    fontWeight: "700",
  },
});

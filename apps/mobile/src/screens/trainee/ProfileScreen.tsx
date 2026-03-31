import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, Alert, ActivityIndicator, Image, ScrollView } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { logOut } from "../../services/auth";

import { auth } from "../../config/firebase";
import { saveUserRole, subscribeToUserProfile, type UserProfile, saveAssignmentStatus, saveUserProfile, uploadProfileImage } from "../../services/userSession";
import { Typography } from "../../components/Typography";
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

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && auth.currentUser) {
        setIsLoading(true);
        await uploadProfileImage(auth.currentUser.uid, result.assets[0].uri);
        setIsLoading(false);
      }
    } catch (e) {
      setIsLoading(false);
      Alert.alert("Upload Failed", "Could not update your profile photo.");
    }
  };

  return (
    <ScreenShell
      title="Profile"
      subtitle="Identity & Account Control"
      contentStyle={styles.shellContent}
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
          <View style={styles.profileHeader}>
            <Pressable onPress={handlePickImage}>
              <View style={styles.avatarLarge}>
                 {profile?.profileImageUrl ? (
                   <Image source={{ uri: profile.profileImageUrl }} style={styles.avatarImage} />
                 ) : (
                   <Typography style={{ color: '#000', fontSize: 24, fontWeight: '900' }}>
                     {profile?.name?.[0]?.toUpperCase() || "U"}
                   </Typography>
                 )}
                 <View style={styles.cameraOverlay}>
                    <Ionicons name="camera" size={12} color="#fff" />
                 </View>
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Typography variant="h2">{profile?.name || "User Profile"}</Typography>
              <Typography variant="label" color="#8c8c8c">ACTIVE TRAINEE ID: #{auth.currentUser?.uid.slice(0, 8).toUpperCase()}</Typography>
            </View>
          </View>

          <View style={styles.bioGrid}>
             <BioTile label="Body Weight" value={`${profile?.weight || "--"} kg`} icon="body-outline" color={colors.primary} />
             <BioTile label="Body Height" value={`${profile?.height || "--"} cm`} icon="resize-outline" color="#60a5fa" />
             <BioTile label="Work Hours" value={profile?.work?.timing?.split('|')[0]?.trim() || "Not set"} icon="briefcase-outline" color="#fbbf24" />
             <BioTile label="Sleep Timing" value={profile?.lifestyle?.sleepTiming?.split('-')[0]?.trim() || "Not set"} icon="moon-outline" color="#a78bfa" />
          </View>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Typography variant="label" color="#444">CURRENT GOAL</Typography>
              <Pressable onPress={() => isEditingGoal ? handleUpdateGoal() : setIsEditingGoal(true)}>
                <Typography style={{ color: colors.primary, fontSize: 11, fontWeight: '900' }}>{isEditingGoal ? "SAVE" : "EDIT"}</Typography>
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
                <Typography variant="h2" style={{ fontSize: 16 }}>{profile?.goal?.replace('_', ' ') || "GENERAL FITNESS"}</Typography>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable
            style={styles.actionRow}
            onPress={() => setNotificationsEnabled((prev: boolean) => !prev)}
          >
            <View style={styles.iconWrap}>
              <View style={styles.miniIconBox}><Ionicons name="notifications" size={16} color={colors.primary} /></View>
              <Typography variant="h2" style={{ fontSize: 15 }}>Coach Notifications</Typography>
            </View>
            <View style={[styles.toggle, notificationsEnabled && styles.toggleActive]}>
              <View style={[styles.toggleCircle, notificationsEnabled && styles.toggleCircleActive]} />
            </View>
          </Pressable>

          <View style={styles.divider} />

          {session.role === "trainee" && (
            <>
              <View style={styles.coachSection}>
                <Typography variant="label" color="#444" style={{ marginBottom: 12 }}>YOUR COACH</Typography>
                {session.selectedCoachId ? (
                  <View style={styles.coachRow}>
                    <View style={styles.coachAvatar}>
                      <Typography style={{ color: colors.primaryText, fontWeight: '900' }}>{session.selectedCoachName?.[0] || "C"}</Typography>
                    </View>
                    <View style={styles.coachInfo}>
                      <Typography variant="h2" style={{ fontSize: 15 }}>{session.selectedCoachName}</Typography>
                      <Typography style={{ color: colors.primary, fontSize: 11, fontWeight: '900' }}>CERTIFIED COACH</Typography>
                    </View>
                    <Pressable style={styles.disconnectBtn} onPress={handleDisconnect}>
                      <Typography style={{ color: "#ff4444", fontSize: 11, fontWeight: '900' }}>END RELATION</Typography>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.noCoachBtn}
                    onPress={() => Alert.alert("No Coach", "Go to the Coaching tab to find a professional coach.")}
                  >
                    <Typography variant="label" color="#8c8c8c">No coach assigned yet</Typography>
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
                <Typography variant="label" color="#444" style={{ marginBottom: 12 }}>PROFESSIONAL PROFILE</Typography>
                <View style={styles.coachProfileBox}>
                  <Typography style={{ color: '#fff' }} numberOfLines={3}>{profile.coachProfile.bio}</Typography>
                  <View style={styles.specRow}>
                    {profile.coachProfile.specialties.slice(0, 3).map((s: string) => (
                      <View key={s} style={styles.specPill}>
                        <Typography style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{s}</Typography>
                      </View>
                    ))}
                  </View>
                  <Typography variant="label" color="#8c8c8c">Exp: {profile.coachProfile.experience}</Typography>
                </View>
              </View>
              <View style={styles.divider} />
            </>
          )}

          <View style={styles.roleSection}>
            <Typography variant="label" color="#444" style={{ marginBottom: 12 }}>ACCOUNT TYPE</Typography>
            <Pressable
              style={[styles.roleCard, isSwitching && { opacity: 0.6 }]}
              onPress={() => handleSwitchRole(session.role)}
              disabled={isSwitching}
            >
              <View style={styles.roleInfo}>
                <View style={styles.roleIconBox}>
                  <Ionicons name={session.role === "trainee" ? "person" : "fitness"} size={20} color={colors.primary} />
                </View>
                <View>
                  <Typography variant="h2" style={{ fontSize: 15 }}>{session.role === "trainee" ? "Trainee Mode" : "Coach Mode"}</Typography>
                  <Typography variant="label" color="#8c8c8c">Tap to switch account type</Typography>
                </View>
              </View>
              <Ionicons name="swap-horizontal" size={18} color="#444" />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
             <Typography style={{ color: "#ff4444", fontWeight: "900", fontSize: 14 }}>SIGN OUT</Typography>
          </Pressable>
        </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

function BioTile({ label, value, icon, color }: any) {
  return (
    <View style={styles.bioTile}>
      <View style={[styles.bioIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Typography variant="label" color="#444" style={{ fontSize: 9 }}>{label.toUpperCase()}</Typography>
      <Typography variant="h2" style={{ fontSize: 14, marginTop: 2 }}>{value}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    paddingBottom: 0,
  },
  scrollContainer: {
    paddingBottom: 140,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  bioTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1c1c1e',
  },
  bioIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#1c1c1e",
    marginVertical: 4,
  },
  inputGroup: {
    gap: 8,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  goalInput: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    padding: 0,
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
  miniIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
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
  coachSection: {
    paddingVertical: 10,
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
  coachInfo: {
    flex: 1,
    marginLeft: 12,
  },
  disconnectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2c2c2e",
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
  coachProfileBox: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 12,
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
  logoutButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


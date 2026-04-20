import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, Alert, ActivityIndicator, Image, ScrollView } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { logOut } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";

import { auth } from "../../config/firebase";
import { subscribeToUserProfile, type UserProfile, saveAssignmentStatus, saveUserProfile, uploadProfileImage } from "../../services/userSession";
import { Typography } from "../../components/Typography";
import { SessionState } from "../../state/types";

export function ProfileScreen({ session }: { session: SessionState }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = subscribeToUserProfile(user.uid, (data) => {
      setProfile(data);
      setTempGoal(data.goal || "");
      setTempName(data.name || auth.currentUser?.displayName || "");
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

  const handleUpdateName = async () => {
    if (!auth.currentUser || !tempName.trim()) return;
    try {
      await saveUserProfile(auth.currentUser.uid, { name: tempName.trim() });
      setIsEditingName(false);
    } catch (e) {
      Alert.alert("Error", "Could not update name.");
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
              {isEditingName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    style={{ flex: 1, color: '#fff', fontSize: 20, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 2 }}
                    value={tempName}
                    onChangeText={setTempName}
                    autoFocus
                  />
                  <Pressable onPress={handleUpdateName}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Typography variant="h2">{profile?.name || "User Profile"}</Typography>
                  <Pressable onPress={() => setIsEditingName(true)} style={{ padding: 4 }}>
                    <Ionicons name="pencil" size={18} color="#8c8c8c" />
                  </Pressable>
                </View>
              )}
              <Typography variant="label" color="#8c8c8c">ACTIVE ID: #{auth.currentUser?.uid.slice(0, 8).toUpperCase()}</Typography>
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
                    onPress={() => navigation.navigate("CoachAssignment")}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="sparkles" size={16} color={colors.primary} />
                      <Typography variant="label" color="#8c8c8c">Find your coach</Typography>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.primary} />
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
    backgroundColor: "#0a0a0a",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1c1c1e",
    gap: 20,
    marginTop: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  bioTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1c1c1e',
  },
  bioIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
    gap: 10,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalDisplay: {
    backgroundColor: "#000",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#1c1c1e",
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
    paddingVertical: 8,
  },
  iconWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  miniIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1c1c1e'
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2c2c2e",
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
    paddingVertical: 4,
  },
  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101010",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222",
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  coachInfo: {
    flex: 1,
    marginLeft: 14,
  },
  disconnectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#ff444415",
    borderWidth: 1,
    borderColor: "#ff444430",
  },
  noCoachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#101010",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#222",
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
    backgroundColor: "#101010",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#222",
    gap: 14,
  },
  specRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  specPill: {
    backgroundColor: "#161616",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1c1c1e'
  },
  logoutButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ff444450",
    backgroundColor: "#ff444410",
    borderRadius: 16,
    paddingVertical: 16,
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


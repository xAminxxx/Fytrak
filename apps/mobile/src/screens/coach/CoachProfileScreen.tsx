import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import { subscribeToUserProfile, saveUserRole, subscribeToCoachTrainees, subscribeToCoachTemplates } from "../../services/userSession";
import { logOut } from "../../services/auth";
import { SessionState } from "../../state/types";

export function CoachProfileScreen({ session }: { session: SessionState }) {
    const navigation = useNavigation<any>();
    const [profile, setProfile] = useState<any>(null);
    const [traineeCount, setTraineeCount] = useState(0);
    const [templateCount, setTemplateCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubProfile = subscribeToUserProfile(user.uid, (data) => {
            setProfile(data);
            setIsLoading(false);
        });

        const unsubTrainees = subscribeToCoachTrainees(user.uid, (data) => {
            setTraineeCount(data.length);
        });

        // Use any template type just to get a total or default to workout
        const unsubTemplates = subscribeToCoachTemplates(user.uid, null, (data) => {
            setTemplateCount(data.length);
        });

        return () => {
            unsubProfile();
            unsubTrainees();
            unsubTemplates();
        };
    }, []);

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: () => void logOut() }
        ]);
    };

    const handleSwitchRole = () => {
        Alert.alert("Switch Mode", "Switch to Trainee mode to log your own personal workouts?", [
            { text: "Cancel", style: "cancel" },
            { text: "Switch", onPress: () => auth.currentUser && saveUserRole(auth.currentUser.uid, "trainee") }
        ]);
    };

    if (isLoading) return (
        <ScreenShell title="Profile" centered>
            <ActivityIndicator color={colors.primary} />
        </ScreenShell>
    );

    const cp = profile?.coachProfile;

    return (
        <ScreenShell
            title="Profile"
            subtitle="Professional identity & settings"
            contentStyle={styles.shellContent}
            rightActionIcon="settings-outline"
            onRightAction={() => Alert.alert("Settings", "App settings coming soon (Theme, Notifications, Privacy).")}
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.avatarWrap}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{profile?.name?.[0] || "?"}</Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                        </View>
                    </View>
                    <Text style={styles.name}>{profile?.name}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.proBadge}><Text style={styles.proBadgeText}>VERIFIED COACH</Text></View>
                    </View>
                </View>

                {/* STATS */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{traineeCount}</Text>
                        <Text style={styles.statLabel}>Clients</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{templateCount}</Text>
                        <Text style={styles.statLabel}>Templates</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{cp?.experience ?? 0}</Text>
                        <Text style={styles.statLabel}>Years Exp</Text>
                    </View>
                </View>

                {/* BIO SECTION */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Professional Bio</Text>
                        <Pressable
                            style={styles.editBtn}
                            onPress={() => navigation.navigate("EditCoachProfile")}
                        >
                            <Ionicons name="create-outline" size={18} color={colors.primary} />
                            <Text style={styles.editBtnText}>EDIT</Text>
                        </Pressable>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.bioText}>
                            {cp?.bio || "No professional bio added yet. Hit edit to tell trainees about yourself!"}
                        </Text>
                    </View>
                </View>

                {/* SPECIALTIES */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Expertise</Text>
                    <View style={styles.tagGrid}>
                        {(!cp?.specialties || cp.specialties.length === 0) ? (
                            <Text style={styles.emptyText}>No specialties listed.</Text>
                        ) : cp.specialties.map((s: string) => (
                            <View key={s} style={styles.tag}>
                                <Text style={styles.tagText}>{s}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ACTIONS */}
                <View style={styles.actions}>
                    <Pressable style={styles.actionRow} onPress={handleSwitchRole}>
                        <View style={styles.actionIconBox}>
                            <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.actionLabel}>Switch to Trainee Mode</Text>
                        <Ionicons name="chevron-forward" size={18} color="#444" />
                    </Pressable>

                    <View style={styles.divider} />

                    <Pressable style={styles.actionRow} onPress={handleLogout}>
                        <View style={[styles.actionIconBox, { backgroundColor: "#2a1a1a" }]}>
                            <Ionicons name="log-out-outline" size={20} color="#ff4444" />
                        </View>
                        <Text style={[styles.actionLabel, { color: "#ff4444" }]}>Sign Out</Text>
                        <Ionicons name="chevron-forward" size={18} color="#444" />
                    </Pressable>
                </View>
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    shellContent: { paddingBottom: 0 },
    scroll: { paddingBottom: 120, gap: 24 },
    header: {
        alignItems: "center",
        marginTop: 10,
    },
    avatarWrap: {
        position: "relative",
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#161616",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    avatarText: {
        color: "#ffffff",
        fontSize: 32,
        fontWeight: "900",
    },
    verifiedBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#000",
        borderRadius: 12,
    },
    name: {
        color: "#ffffff",
        fontSize: 24,
        fontWeight: "900",
        marginBottom: 8,
    },
    badgeRow: {
        flexDirection: "row",
        gap: 8,
    },
    proBadge: {
        backgroundColor: "#1a1a10",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: `${colors.primary}40`,
    },
    proBadgeText: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 1,
    },
    statsGrid: {
        flexDirection: "row",
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: "#161616",
        borderRadius: 20,
        padding: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    statVal: {
        color: "#ffffff",
        fontSize: 20,
        fontWeight: "900",
    },
    statLabel: {
        color: "#666",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        marginTop: 2,
    },
    section: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingRight: 4,
    },
    editBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#1c1c1e",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#333",
    },
    editBtnText: {
        color: colors.primary,
        fontSize: 11,
        fontWeight: "900",
    },
    sectionTitle: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "800",
        paddingLeft: 4,
    },
    emptyText: {
        color: "#444",
        fontSize: 13,
        fontWeight: "500",
        fontStyle: "italic",
    },
    card: {
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    bioText: {
        color: "#8c8c8c",
        fontSize: 14,
        lineHeight: 22,
        fontWeight: "500",
    },
    tagGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingLeft: 4,
    },
    tag: {
        backgroundColor: "#161616",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    tagText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: "700",
    },
    actions: {
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 8,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        gap: 16,
    },
    actionIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
    },
    actionLabel: {
        flex: 1,
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
    },
    divider: {
        height: 1,
        backgroundColor: "#2c2c2e",
        marginHorizontal: 16,
    }
});

import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import { subscribeToCoachTrainees } from "../../services/userSession";
import { useNavigation } from "@react-navigation/native";

export function CoachClientsScreen() {
    const [trainees, setTrainees] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const navigation = useNavigation<any>();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = subscribeToCoachTrainees(user.uid, (data) => {
            setTrainees(data.filter((t: any) => t.assignmentStatus === "assigned"));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filtered = trainees.filter(t => (t.name || "").toLowerCase().includes(search.toLowerCase()));

    return (
        <ScreenShell
            title="Clients"
            subtitle="Your active trainee roster"
            contentStyle={styles.shellContent}
        >
            <View style={styles.headerRow}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#666" />
                    <TextInput
                        placeholder="Search trainees..."
                        placeholderTextColor="#666"
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <Pressable style={styles.filterBtn}>
                    <Ionicons name="filter" size={20} color="#ffffff" />
                </Pressable>
            </View>

            {isLoading ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {filtered.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>No clients found.</Text>
                        </View>
                    ) : (
                        filtered.map((t) => (
                            <Pressable
                                key={t.id}
                                style={styles.clientCard}
                                onPress={() => navigation.navigate("TraineeDetail", { traineeId: t.id, traineeName: t.name || "Anonymous" })}
                            >
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{(t.name || "?")[0]}</Text>
                                </View>
                                <View style={styles.info}>
                                    <Text style={styles.name}>{t.name || "Anonymous"}</Text>
                                    <View style={styles.statusRow}>
                                        <View style={styles.statusDot} />
                                        <Text style={styles.goal}>{t.profile?.goal || "General Fitness"}</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#333" />
                            </Pressable>
                        ))
                    )}
                </ScrollView>
            )}
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    shellContent: {
        paddingBottom: 0,
    },
    headerRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
        marginTop: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161616",
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 10,
    },
    searchInput: {
        flex: 1,
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "600",
    },
    filterBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: "#161616",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    loader: {
        marginTop: 40,
    },
    list: {
        paddingBottom: 100,
        gap: 12,
    },
    clientCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#333",
    },
    avatarText: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "800",
    },
    info: {
        flex: 1,
        gap: 4,
    },
    name: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "800",
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    goal: {
        color: "#8c8c8c",
        fontSize: 12,
        fontWeight: "600",
    },
    emptyBox: {
        padding: 40,
        alignItems: "center",
    },
    emptyText: {
        color: "#444",
        fontSize: 14,
        fontWeight: "600",
    }
});

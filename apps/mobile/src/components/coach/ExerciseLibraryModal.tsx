import { Modal, View, Text, TextInput, ActivityIndicator, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { Typography } from "../Typography";
import { ExerciseLibraryItem, t as tEx } from "../../constants/exercises";

type ExerciseLibraryModalProps = {
    visible: boolean;
    onClose: () => void;
    searchQuery: string;
    onSearchChange: (text: string) => void;
    isSearching: boolean;
    filteredExercises: ExerciseLibraryItem[];
    onAddCustom: (name: string) => void;
    onSelectInfo: (ex: ExerciseLibraryItem) => void;
    onApplySelection: (ex: ExerciseLibraryItem) => void;
};

export function ExerciseLibraryModal({
    visible,
    onClose,
    searchQuery,
    onSearchChange,
    isSearching,
    filteredExercises,
    onAddCustom,
    onSelectInfo,
    onApplySelection,
}: ExerciseLibraryModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Typography variant="h2" style={{ color: "#fff" }}>Add Exercise</Typography>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </Pressable>
                    </View>

                    <TextInput
                        style={[styles.input, { marginTop: 20, marginBottom: 10 }]}
                        placeholder="Search 800+ exercises..."
                        placeholderTextColor="#666"
                        value={searchQuery}
                        onChangeText={onSearchChange}
                    />

                    {isSearching && (
                        <View style={{ paddingVertical: 10, alignItems: "center" }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    )}

                    <ScrollView style={{ flex: 1 }}>
                        {filteredExercises.length === 0 ? (
                            <View style={{ paddingVertical: 40, alignItems: "center" }}>
                                <Typography variant="label" color="#444">No matches found</Typography>
                                <Pressable
                                    style={[styles.loadBtn, { marginTop: 12, backgroundColor: "#111" }]}
                                    onPress={() => onAddCustom(searchQuery || "Custom Exercise")}
                                >
                                    <Ionicons name="add" size={18} color={colors.primary} />
                                    <Text style={styles.loadBtnText}>ADD "{searchQuery.toUpperCase() || "CUSTOM"}"</Text>
                                </Pressable>
                            </View>
                        ) : (
                            filteredExercises.map((ex) => (
                                <View key={ex.id} style={styles.exerciseSelectItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalItemTitle}>{tEx(ex.name)}</Text>
                                        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                                            <View style={styles.tag}><Text style={styles.tagText}>{ex.muscleGroup.toUpperCase()}</Text></View>
                                            <View style={styles.tag}><Text style={styles.tagText}>{ex.equipment.toUpperCase()}</Text></View>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: "row", gap: 12 }}>
                                        <Pressable
                                            style={styles.infoIconBtn}
                                            onPress={() => onSelectInfo(ex)}
                                        >
                                            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                                        </Pressable>
                                        <Pressable
                                            style={styles.addIconCircle}
                                            onPress={() => onApplySelection(ex)}
                                        >
                                            <Ionicons name="add" size={20} color="#000" />
                                        </Pressable>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    {!searchQuery && (
                        <Pressable
                            style={[styles.addExBtn, { marginTop: 10, borderStyle: "solid" }]}
                            onPress={() => onAddCustom("Custom Exercise")}
                        >
                            <Ionicons name="create-outline" size={20} color="#fff" />
                            <Text style={styles.addExText}>ADD CUSTOM EXERCISE</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#111",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: "85%",
        padding: 24,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#222",
        alignItems: "center",
        justifyContent: "center",
    },
    input: {
        backgroundColor: "#1c1c1e",
        borderRadius: 16,
        padding: 16,
        color: "#fff",
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    loadBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1c1c1e",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    loadBtnText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    exerciseSelectItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#222",
    },
    modalItemTitle: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
    },
    tag: {
        backgroundColor: "#222",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        color: "#888",
        fontSize: 10,
        fontWeight: "700",
    },
    infoIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#222",
        alignItems: "center",
        justifyContent: "center",
    },
    addIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    addExBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1c1c1e",
        padding: 16,
        borderRadius: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: "#333",
        borderStyle: "dashed",
    },
    addExText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
});

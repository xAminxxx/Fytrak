import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { uploadChatImage } from "../../services/cloudinaryUpload";
import { ChatMessage } from "../../types/chat";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";

const formatTime = (value: string): string => {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../config/firebase";

type CoachChatScreenProps = {
  traineeId: string;
  coachId: string;
  traineeName?: string;
};

export function CoachChatScreen({ traineeId, coachId, traineeName }: CoachChatScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const threadId = useMemo(() => {
    return [traineeId, coachId].sort().join("_");
  }, [traineeId, coachId]);

  useEffect(() => {
    const q = query(
      collection(db, "chats", threadId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => {
        const data = doc.data();
        let createdAt = new Date().toISOString();
        if (data.createdAt instanceof Timestamp) {
          createdAt = data.createdAt.toDate().toISOString();
        }

        return {
          id: doc.id,
          ...data,
          createdAt,
        } as ChatMessage;
      });
      setMessages(fetched);
    });

    return unsubscribe;
  }, [threadId]);

  const sendTextMessage = async () => {
    if (!draft.trim()) return;

    const text = draft.trim();
    setDraft("");
    setErrorText(null);

    try {
      const myId = auth.currentUser?.uid || "unknown";
      const otherId = myId === traineeId ? coachId : traineeId;

      await addDoc(collection(db, "chats", threadId, "messages"), {
        threadId,
        senderId: myId,
        receiverId: otherId,
        type: "text" as const,
        text,
        status: "sent",
        createdAt: serverTimestamp(),
        readAt: null,
      });
    } catch (error) {
      console.error("Send failed:", error);
      setErrorText("Failed to send message.");
    }
  };

  const pickAndUploadImage = async () => {
    setErrorText(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorText("Gallery permission is required to send images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      setIsUploading(true);
      const uploaded = await uploadChatImage(result.assets[0].uri);

      const myId = auth.currentUser?.uid || "unknown";
      const otherId = myId === traineeId ? coachId : traineeId;

      await addDoc(collection(db, "chats", threadId, "messages"), {
        threadId,
        senderId: myId,
        receiverId: otherId,
        type: "image" as const,
        text: "",
        image: {
          url: uploaded.secureUrl,
          publicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          bytes: uploaded.bytes,
        },
        status: "sent",
        createdAt: serverTimestamp(),
        readAt: null,
      });
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScreenShell
      title={traineeName ? `Chat: ${traineeName}` : "Coach Chat"}
      subtitle={traineeName ? "Discussion with your trainee" : "Direct support with your assigned coach"}
      contentStyle={styles.shellContent}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const mine = item.senderId === auth.currentUser?.uid;

            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleCoach]}>
                {item.type === "text" ? (
                  <Text style={[styles.messageText, mine ? styles.textMine : styles.textCoach]}>
                    {item.text}
                  </Text>
                ) : null}

                {item.type === "image" && item.image ? (
                  <Image source={{ uri: item.image.url }} style={styles.imagePreview} resizeMode="cover" />
                ) : null}

                <View style={styles.bubbleFooter}>
                  <Text style={[styles.metaText, mine ? styles.metaMine : styles.metaCoach]}>
                    {formatTime(item.createdAt)}
                  </Text>
                  {mine && (
                    <Ionicons
                      name={item.status === "read" ? "checkmark-done" : "checkmark"}
                      size={14}
                      color={item.status === "read" ? colors.primary : "#8c8c8c"}
                    />
                  )}
                </View>
              </View>
            );
          }}
        />

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <View style={styles.composerWrapper}>
          <View style={styles.composerRow}>
            <Pressable
              style={styles.attachButton}
              disabled={isUploading}
              onPress={() => void pickAndUploadImage()}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="image" size={22} color={colors.primary} />
              )}
            </Pressable>

            <TextInput
              placeholder="Message..."
              placeholderTextColor="#8c8c8c"
              value={draft}
              onChangeText={setDraft}
              style={styles.input}
              multiline
            />

            <Pressable
              style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
              onPress={sendTextMessage}
              disabled={!draft.trim()}
            >
              <Ionicons name="send" size={20} color={colors.primaryText} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
  },
  messagesList: {
    gap: 12,
    paddingBottom: 120,
    paddingTop: 10,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 20,
    padding: 12,
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleCoach: {
    backgroundColor: "#1c1c1e",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#333",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  textMine: {
    color: "#000000",
  },
  textCoach: {
    color: "#ffffff",
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 10,
    fontWeight: "600",
  },
  metaMine: {
    color: "rgba(0,0,0,0.5)",
  },
  metaCoach: {
    color: "#8c8c8c",
  },
  imagePreview: {
    width: 240,
    height: 240,
    borderRadius: 14,
    backgroundColor: "#222",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
  },
  composerWrapper: {
    position: "absolute",
    bottom: 80, // Above floating tab bar
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  composerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#161616",
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  attachButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#ffffff",
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: "#333",
    opacity: 0.5,
  },
});


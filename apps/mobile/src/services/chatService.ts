import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import type { ChatImage, ChatMessage, ChatMessageType } from "../types/chat";
import { updateClientSummaryAfterMessage } from "./clientSummaryService";

const chatsCollection = "chats";

export const getChatThreadId = (traineeId: string, coachId: string): string => {
  return [traineeId, coachId].sort().join("_");
};

const toIsoString = (value: unknown): string => {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
};

const parseChatMessage = (id: string, data: Record<string, unknown>): ChatMessage => {
  const type = data.type === "image" ? "image" : "text";
  const image = data.image && typeof data.image === "object" ? data.image as ChatImage : undefined;

  return {
    id,
    threadId: typeof data.threadId === "string" ? data.threadId : "",
    senderId: typeof data.senderId === "string" ? data.senderId : "",
    receiverId: typeof data.receiverId === "string" ? data.receiverId : "",
    type,
    text: typeof data.text === "string" ? data.text : "",
    image,
    status: data.status === "read" ? "read" : "sent",
    createdAt: toIsoString(data.createdAt),
    readAt: data.readAt ? toIsoString(data.readAt) : null,
  };
};

export type ChatThreadSummary = {
  threadId: string;
  lastMessageText: string;
  lastMessageType: ChatMessageType;
  lastMessageAt: string | null;
  lastSenderId: string | null;
};

export const subscribeToChatMessages = (
  threadId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
) => {
  const messagesQuery = query(
    collection(db, chatsCollection, threadId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((doc) => parseChatMessage(doc.id, doc.data())));
    },
    (error) => {
      onError?.(error);
    }
  );
};

export const subscribeToLatestMessage = (
  threadId: string,
  onChange: (summary: ChatThreadSummary | null) => void
) => {
  const q = query(
    collection(db, chatsCollection, threadId, "messages"),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      onChange(null);
      return;
    }
    const docSnap = snapshot.docs[0];
    const message = parseChatMessage(docSnap.id, docSnap.data());
    onChange({
      threadId,
      lastMessageText: message.type === "image" ? "Image" : message.text,
      lastMessageType: message.type,
      lastMessageAt: message.createdAt,
      lastSenderId: message.senderId,
    });
  });
};

type SendChatMessageInput = {
  threadId: string;
  traineeId: string;
  coachId: string;
  type: ChatMessageType;
  text?: string;
  image?: ChatImage;
};

export const sendChatMessage = async ({
  threadId,
  traineeId,
  coachId,
  type,
  text = "",
  image,
}: SendChatMessageInput): Promise<void> => {
  const senderId = auth.currentUser?.uid;
  if (!senderId) throw new Error("You must be signed in to send messages.");

  const receiverId = senderId === traineeId ? coachId : traineeId;

  await addDoc(collection(db, chatsCollection, threadId, "messages"), {
    threadId,
    senderId,
    receiverId,
    participants: [traineeId, coachId],
    type,
    text,
    image: image ?? null,
    status: "sent",
    createdAt: serverTimestamp(),
    readAt: null,
  });

  const summaryText = type === "image" ? "Image" : text;
  try {
    await updateClientSummaryAfterMessage({
      traineeId,
      senderId,
      text: summaryText,
      incrementUnreadForCoach: senderId === traineeId,
    });
  } catch (error) {
    console.error("Failed to update message summary:", error);
  }
};

export const fetchLatestThreadMessage = async (threadId: string): Promise<ChatThreadSummary | null> => {
  const messagesQuery = query(
    collection(db, chatsCollection, threadId, "messages"),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(messagesQuery);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const message = parseChatMessage(docSnap.id, docSnap.data());
  return {
    threadId,
    lastMessageText: message.type === "image" ? "Image" : message.text,
    lastMessageType: message.type,
    lastMessageAt: message.createdAt,
    lastSenderId: message.senderId,
  };
};

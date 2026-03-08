export type ChatMessageType = "text" | "image";

export type ChatImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  receiverId: string;
  type: ChatMessageType;
  text: string;
  image?: ChatImage;
  status: "sent" | "read";
  createdAt: string;
  readAt: string | null;
};

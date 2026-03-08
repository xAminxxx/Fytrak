export type UserRole = "trainee" | "coach" | "admin";

export type AssignmentStatus =
  | "unassigned"
  | "pending"
  | "assigned"
  | "rejected"
  | "expired";

export type CoachVerificationStatus =
  | "not_submitted"
  | "under_review"
  | "verified"
  | "rejected";

export type ChatMessageType = "text" | "image";

export type ChatImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

export type ChatMessageStatus = "sent" | "read";

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  receiverId: string;
  type: ChatMessageType;
  text: string;
  image?: ChatImage;
  status: ChatMessageStatus;
  createdAt: string;
  readAt: string | null;
};

export type EventName =
  | "assignment_requested"
  | "assignment_approved"
  | "assignment_rejected"
  | "coach_message_sent"
  | "workout_completed"
  | "meal_logged"
  | "checkin_submitted"
  | "adherence_updated";

export type UserRole = "trainee" | "coach";

export type AssignmentStatus =
  | "unassigned"
  | "pending"
  | "assigned"
  | "rejected"
  | "expired";

export type SessionState = {
  isAuthenticated: boolean;
  role: UserRole;
  profileCompleted: boolean;
  assignmentStatus: AssignmentStatus;
  selectedCoachId: string | null;
  selectedCoachName: string | null;
};

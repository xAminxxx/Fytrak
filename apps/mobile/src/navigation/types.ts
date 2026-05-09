import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { MaterialTopTabNavigationProp } from "@react-navigation/material-top-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  CompleteProfile: undefined;
  CoachAssignment: undefined;
  PendingCoach: undefined;
  TraineeTabs: undefined;
  CoachTabs: undefined;
  Profile: undefined;
  TraineeDetail: { traineeId: string; traineeName: string };
  PrescribeWorkout: { traineeId: string; traineeName: string };
  CreateProgram: { traineeId: string; traineeName: string };
  PrescribeMeal: { traineeId: string; traineeName: string };
  CoachChat: { traineeId: string; traineeName?: string; coachId: string };
  CreateTemplate: { type: "workout" | "meal"; template?: unknown };
  TemplateDetail: { templateId: string; type: "workout" | "meal" };
  EditCoachProfile: undefined;
};

export type CoachTabsParamList = {
  CoachHome: undefined;
  CoachClients: undefined;
  CoachLibrary: undefined;
  CoachInbox: undefined;
  CoachProfile: undefined;
};

export type TraineeTabsParamList = {
  Workouts: { autoLoadPrescriptionId?: string } | undefined;
  Nutrition: undefined;
  Home: undefined;
  Progress: undefined;
  Chat: undefined;
};

export type RootStackNavigation = NativeStackNavigationProp<RootStackParamList>;

export type CoachHomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<CoachTabsParamList, "CoachHome">,
  NativeStackNavigationProp<RootStackParamList>
>;

export type TraineeHomeNavigation = CompositeNavigationProp<
  MaterialTopTabNavigationProp<TraineeTabsParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

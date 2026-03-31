import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useNavigation } from "@react-navigation/native";
import { FytrakTabBar } from "./FytrakTabBar";
import { CoachChatScreen } from "../screens/trainee/CoachChatScreen";
import { NutritionScreen } from "../screens/trainee/NutritionScreen";
import { ProgressScreen } from "../screens/trainee/ProgressScreen";
import { TraineeHomeScreen } from "../screens/trainee/TraineeHomeScreen";
import { WorkoutLogScreen } from "../screens/trainee/WorkoutLogScreen";
import { auth } from "../config/firebase";

import { SessionState } from "../state/types";

export type TraineeTabsParamList = {
  Workouts: undefined;
  Nutrition: undefined;
  Home: undefined;
  Progress: undefined;
  Chat: undefined;
};

const Tab = createMaterialTopTabNavigator<TraineeTabsParamList>();

export function TraineeTabs({ session }: { session: SessionState }) {
  const navigation = useNavigation();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBarPosition="bottom"
      screenOptions={{
        lazy: true,
        swipeEnabled: true,
      }}
      tabBar={(props) => <FytrakTabBar {...props} />}
    >
      <Tab.Screen name="Workouts" component={WorkoutLogScreen} />
      <Tab.Screen name="Nutrition" component={NutritionScreen} />
      <Tab.Screen name="Home">
        {(props: any) => (
          <TraineeHomeScreen
            onQuickAskCoach={() => props.navigation.navigate("Chat")}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen
        name="Chat"
        children={() => (
          <CoachChatScreen
            traineeId={auth.currentUser?.uid || "unknown"}
            coachId={session.selectedCoachId || "unknown"}
          />
        )}
      />
    </Tab.Navigator>
  );
}

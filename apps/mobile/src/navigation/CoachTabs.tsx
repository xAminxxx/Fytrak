import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FytrakTabBar } from "./FytrakTabBar";
import { CoachHomeScreen } from "../screens/coach/CoachHomeScreen";
import { CoachClientsScreen } from "../screens/coach/CoachClientsScreen";
import { CoachLibraryScreen } from "../screens/coach/CoachLibraryScreen";
import { CoachInboxScreen } from "../screens/coach/CoachInboxScreen";
import { CoachProfileScreen } from "../screens/coach/CoachProfileScreen";
import { SessionState } from "../state/types";
import type { CoachTabsParamList } from "./types";

const Tab = createBottomTabNavigator<CoachTabsParamList>();

export function CoachTabs({ session }: { session: SessionState }) {
    return (
        <Tab.Navigator
            initialRouteName="CoachHome"
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <FytrakTabBar {...props} />}
        >
            <Tab.Screen name="CoachHome" component={CoachHomeScreen} />
            <Tab.Screen name="CoachClients" component={CoachClientsScreen} />
            <Tab.Screen name="CoachLibrary" component={CoachLibraryScreen} />
            <Tab.Screen name="CoachInbox" component={CoachInboxScreen} />
            <Tab.Screen name="CoachProfile">
                {() => <CoachProfileScreen session={session} />}
            </Tab.Screen>
        </Tab.Navigator>
    );
}

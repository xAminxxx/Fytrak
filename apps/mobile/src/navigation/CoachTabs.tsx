import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FytrakTabBar } from "./FytrakTabBar";
import { CoachHomeScreen } from "../screens/coach/CoachHomeScreen";
import { CoachClientsScreen } from "../screens/coach/CoachClientsScreen";
import { CoachLibraryScreen } from "../screens/coach/CoachLibraryScreen";
import { CoachProfileScreen } from "../screens/coach/CoachProfileScreen";
import { SessionState } from "../state/types";

export type CoachTabsParamList = {
    CoachHome: undefined;
    CoachClients: undefined;
    CoachLibrary: undefined;
    CoachProfile: undefined;
};

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
            <Tab.Screen name="CoachProfile">
                {() => <CoachProfileScreen session={session} />}
            </Tab.Screen>
        </Tab.Navigator>
    );
}

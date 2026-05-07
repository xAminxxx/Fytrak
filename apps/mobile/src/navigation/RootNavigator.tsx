import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { CompleteProfileScreen } from "../screens/auth/CompleteProfileScreen";
import { CoachCompleteProfileScreen } from "../screens/coach/CoachCompleteProfileScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { SignUpScreen } from "../screens/auth/SignUpScreen";
import { CreateTemplateScreen } from "../screens/coach/CreateTemplateScreen";
import { EditCoachProfileScreen } from "../screens/coach/EditCoachProfileScreen";
import { PrescribeMealScreen } from "../screens/coach/PrescribeMealScreen";
import { TemplateDetailScreen } from "../screens/coach/TemplateDetailScreen";
import {
  loginWithEmailPassword,
  signInWithGoogleIdToken,
  signUpWithEmailPassword,
} from "../services/auth";
import { CoachAssignmentScreen } from "../screens/trainee/CoachAssignmentScreen";
import { PendingCoachScreen } from "../screens/trainee/PendingCoachScreen";
import { SessionState } from "../state/types";
import { TraineeTabs } from "./TraineeTabs";
import { CoachTabs } from "./CoachTabs";
import { ProfileScreen } from "../screens/trainee/ProfileScreen";
import { TraineeDetailScreen } from "../screens/coach/TraineeDetailScreen";
import { PrescribeWorkoutScreen } from "../screens/coach/PrescribeWorkoutScreen";
import { CreateProgramScreen } from "../screens/coach/CreateProgramScreen";
import { CoachChatScreen } from "../screens/trainee/CoachChatScreen";
import { auth } from "../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { SplashScreen } from "../screens/onboarding/SplashScreen";
import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";
import {
  ensureUserSession,
  saveAssignmentStatus,
  saveCoachRequest,
  saveCompleteProfile,
  saveCoachProfile,
} from "../services/userSession";
import { calculateNutritionPlan } from '../utils/calculators';
import { db } from "../config/firebase";
import { OnboardingFlow } from "../screens/onboarding/OnboardingFlow";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const initialSession: SessionState = {
  isAuthenticated: false,
  role: "trainee",
  profileCompleted: false,
  assignmentStatus: "unassigned",
  selectedCoachId: null,
  selectedCoachName: null,
};

export function RootNavigator() {
  const [session, setSession] = useState<SessionState>(initialSession);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("[RootNavigator] Firebase Auth User:", user ? user.uid : "NULL");

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (!user) {
        setSession(initialSession);
        setIsBootstrapping(false);
        return;
      }

      // Real-time listener for user session data
      const userRef = doc(db, "users", user.uid);
      unsubscribeDoc = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSession({
            isAuthenticated: true,
            role: data.role || "trainee",
            profileCompleted: data.profileCompleted || false,
            assignmentStatus: data.assignmentStatus || "unassigned",
            selectedCoachId: data.selectedCoachId || null,
            selectedCoachName: data.selectedCoachName || null,
          });
        } else {
          // Document doesn't exist yet, but authenticated
          setSession(prev => ({ ...prev, isAuthenticated: true }));
        }
        setIsBootstrapping(false);
      }, (error) => {
        console.error("[RootNavigator] Firestore sync failed:", error);
        setSession(prev => ({ ...prev, isAuthenticated: true }));
        setIsBootstrapping(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const handleAuthSuccess = async (initialRole?: "trainee" | "coach") => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Authentication succeeded but no user user session was found.");
    }

    const persisted = await ensureUserSession(user.uid, initialRole);
    setSession(persisted);
  };


  if (isBootstrapping || !isSplashFinished) {
    return <SplashScreen onFinish={() => setIsSplashFinished(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session.isAuthenticated ? (
          /* AUTHENTICATION FLOW */
          <>
            {showWelcome && (
              <Stack.Screen name="Welcome" options={{ animation: 'fade' }}>
                {() => <WelcomeScreen onStart={() => setShowWelcome(false)} />}
              </Stack.Screen>
            )}
            <Stack.Screen name="Login">
              {() => (
                <LoginScreen
                  onLogin={async ({ email, password }) => {
                    await loginWithEmailPassword(email, password);
                    handleAuthSuccess();
                  }}
                  onGoogleLogin={async (idToken) => {
                    await signInWithGoogleIdToken(idToken);
                    handleAuthSuccess();
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="SignUp">
              {() => (
                <SignUpScreen
                  onSignUp={async ({ name, email, password, role }) => {
                    await signUpWithEmailPassword(name, email, password, role);
                    handleAuthSuccess(role);
                  }}
                  onGoogleLogin={async (idToken) => {
                    await signInWithGoogleIdToken(idToken);
                    handleAuthSuccess();
                  }}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          /* APPLICATION FLOW */
          <>
            {!session.profileCompleted ? (
              <Stack.Screen name="CompleteProfile">
                {() =>
                  session.role === "coach" ? (
                    <CoachCompleteProfileScreen
                      onComplete={async (payload) => {
                        const user = auth.currentUser;
                        if (!user) {
                          throw new Error("Please login again to continue.");
                        }
                        await saveCoachProfile(user.uid, payload);
                        setSession((prev) => ({ ...prev, profileCompleted: true }));
                      }}
                    />
                  ) : (
                    <OnboardingFlow
                      onComplete={async (payload) => {
                        const user = auth.currentUser;
                        if (!user) {
                          throw new Error("Please login again to continue.");
                        }
                        // Calculate expert-level nutrition plan
                        const nutritionPlan = calculateNutritionPlan(payload);

                        // Transition payload into saving service
                        await saveCompleteProfile(user.uid, {
                          ...payload,
                          goal: payload.goal || '',
                          macroTargets: {
                            calories: nutritionPlan.calories,
                            protein: nutritionPlan.protein,
                            carbs: nutritionPlan.carbs,
                            fats: nutritionPlan.fats
                          }
                        });
                        setSession((prev) => ({ ...prev, profileCompleted: true }));
                      }}
                      onExit={() => {
                        auth.signOut();
                        setSession(initialSession);
                      }}
                    />
                  )
                }
              </Stack.Screen>
            ) : session.role === "coach" ? (
              <Stack.Screen name="CoachTabs">
                {() => <CoachTabs session={session} />}
              </Stack.Screen>
            ) : (
              /* TRAINEE FLOW - NO BLOCKER */
              <>
                <Stack.Screen name="TraineeTabs">
                  {() => <TraineeTabs session={session} />}
                </Stack.Screen>
                <Stack.Screen name="CoachAssignment">
                  {() => (
                    <CoachAssignmentScreen
                      onSendRequest={async (coach) => {
                        const user = auth.currentUser;
                        if (!user) throw new Error("Please login again.");
                        await saveCoachRequest(user.uid, coach);
                        setSession((prev) => ({
                          ...prev,
                          assignmentStatus: "pending",
                          selectedCoachId: coach.id,
                          selectedCoachName: coach.name,
                        }));
                      }}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="PendingCoach">
                  {() => (
                    <PendingCoachScreen
                      coachName={session.selectedCoachName}
                      onSimulateApprove={async () => {
                        const user = auth.currentUser;
                        if (!user) throw new Error("Please login again.");
                        await saveAssignmentStatus(user.uid, "assigned");
                        setSession((prev) => ({ ...prev, assignmentStatus: "assigned" }));
                      }}
                    />
                  )}
                </Stack.Screen>
              </>
            )}
            <Stack.Screen name="Profile">
              {() => <ProfileScreen session={session} />}
            </Stack.Screen>
            <Stack.Screen name="TraineeDetail" component={TraineeDetailScreen} />
            <Stack.Screen name="PrescribeWorkout" component={PrescribeWorkoutScreen} />
            <Stack.Screen name="CreateProgram" component={CreateProgramScreen} />
            <Stack.Screen name="PrescribeMeal" component={PrescribeMealScreen} />
            <Stack.Screen name="CoachChat">
              {({ route }) => (
                <CoachChatScreen
                  coachId={route.params.coachId}
                  traineeId={route.params.traineeId}
                  traineeName={route.params.traineeName}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CreateTemplate" component={CreateTemplateScreen} />
            <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
            <Stack.Screen name="EditCoachProfile" component={EditCoachProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

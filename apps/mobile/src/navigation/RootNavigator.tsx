import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState } from "react";
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
  signInWithFacebookAccessToken,
  signInWithGoogleIdToken,
  signUpWithEmailPassword,
} from "../services/auth";
import { CoachAssignmentScreen } from "../screens/trainee/CoachAssignmentScreen";
import { PendingCoachScreen } from "../screens/trainee/PendingCoachScreen";
import { TraineeTabs } from "./TraineeTabs";
import { CoachTabs } from "./CoachTabs";
import { ProfileScreen } from "../screens/trainee/ProfileScreen";
import { TraineeDetailScreen } from "../screens/coach/TraineeDetailScreen";
import { PrescribeWorkoutScreen } from "../screens/coach/PrescribeWorkoutScreen";
import { CreateProgramScreen } from "../screens/coach/CreateProgramScreen";
import { CoachChatScreen } from "../screens/trainee/CoachChatScreen";
import { auth } from "../config/firebase";
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
import { OnboardingFlow } from "../screens/onboarding/OnboardingFlow";
import { useSessionState } from "../hooks/useSessionState";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, isBootstrapping } = useSessionState();
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const handleAuthSuccess = async (initialRole?: "trainee" | "coach") => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Authentication succeeded but no user user session was found.");
    }

    await ensureUserSession(user.uid, initialRole);
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
                  onFacebookLogin={async (accessToken) => {
                    await signInWithFacebookAccessToken(accessToken);
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
                  onGoogleLogin={async (idToken, role) => {
                    await signInWithGoogleIdToken(idToken);
                    handleAuthSuccess(role);
                  }}
                  onFacebookLogin={async (accessToken, role) => {
                    await signInWithFacebookAccessToken(accessToken);
                    handleAuthSuccess(role);
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
                      }}
                      onExit={() => {
                        auth.signOut();
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

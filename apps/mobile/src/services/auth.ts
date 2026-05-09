import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../config/firebase";

const firebaseErrorMap: Record<string, string> = {
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/missing-password": "Password is required.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/email-already-in-use": "This email is already in use.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/account-exists-with-different-credential": "An account already exists with this email. Sign in with the original provider first.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/operation-not-allowed": "This sign-in provider is not enabled in Firebase.",
};

const mapAuthError = (error: unknown): Error => {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: string }).code);
    const message = firebaseErrorMap[code] ?? "Authentication failed. Please try again.";
    return new Error(message);
  }

  return new Error("Authentication failed. Please try again.");
};

export const loginWithEmailPassword = async (email: string, password: string): Promise<void> => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw mapAuthError(error);
  }
};

export const signUpWithEmailPassword = async (
  name: string,
  email: string,
  password: string,
  role: "trainee" | "coach"
): Promise<void> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    if (name.trim()) {
      await updateProfile(userCredential.user, {
        displayName: name.trim(),
      });
    }
  } catch (error) {
    throw mapAuthError(error);
  }
};

export const signInWithGoogleIdToken = async (idToken: string): Promise<void> => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  } catch (error) {
    throw mapAuthError(error);
  }
};

export const signInWithFacebookAccessToken = async (accessToken: string): Promise<void> => {
  try {
    const credential = FacebookAuthProvider.credential(accessToken);
    await signInWithCredential(auth, credential);
  } catch (error) {
    throw mapAuthError(error);
  }
};

export const logOut = async (): Promise<void> => {
  try {
    console.log("[AuthService] Attempting to sign out...");
    await auth.signOut();
    console.log("[AuthService] Sign out successful.");
  } catch (error) {
    console.error("[AuthService] Logout error:", error);
    throw mapAuthError(error);
  }
};

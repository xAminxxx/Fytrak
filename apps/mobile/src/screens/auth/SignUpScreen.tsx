import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../components/Typography";
import { PrimaryButton } from "../../components/Button";
import * as WebBrowser from "expo-web-browser";
import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import { appEnv } from "../../config/env";
import { expoAuthProxyRedirectUri } from "../../utils/authRedirect";

WebBrowser.maybeCompleteAuthSession();

type SignUpScreenProps = {
  onSignUp: (payload: { name: string; email: string; password: string; role: "trainee" | "coach" }) => Promise<void>;
  onGoogleLogin: (idToken: string, role: "trainee" | "coach") => Promise<void>;
  onFacebookLogin: (accessToken: string, role: "trainee" | "coach") => Promise<void>;
};

export function SignUpScreen({ onSignUp, onGoogleLogin, onFacebookLogin }: SignUpScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"trainee" | "coach">("trainee");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [request, _response, promptAsync] = Google.useAuthRequest({
    clientId: appEnv.google.webClientId,
    webClientId: appEnv.google.webClientId,
    androidClientId: appEnv.google.webClientId,
    scopes: ["openid", "profile", "email"],
    responseType: ResponseType.IdToken,
    redirectUri: expoAuthProxyRedirectUri,
  });
  const [facebookRequest, _facebookResponse, promptFacebookAsync] = Facebook.useAuthRequest({
    clientId: appEnv.facebook.appId || "missing-facebook-app-id",
    redirectUri: expoAuthProxyRedirectUri,
  });

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 1 &&
      email.includes("@") &&
      password.length >= 6 &&
      confirmPassword === password &&
      acceptedTerms
    );
  }, [acceptedTerms, confirmPassword, email, name, password]);

  const handleSignUp = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText(null);
      await onSignUp({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
      });
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Sign up failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!appEnv.google.webClientId || !request) {
      setErrorText("Google Authentication is not configured.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText(null);
      const result = await promptAsync();

      if (result.type !== "success") {
        setErrorText("Google sign-in was cancelled.");
        return;
      }

      const idToken = result.params?.id_token;
      if (!idToken) {
        setErrorText("Google sign-in failed: missing ID token.");
        return;
      }

      await onGoogleLogin(idToken, role);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacebookLogin = async () => {
    if (!appEnv.facebook.appId || !facebookRequest) {
      setErrorText("Facebook Authentication is not configured.");
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorText(null);
      const result = await promptFacebookAsync();

      if (result.type !== "success") {
        setErrorText("Facebook sign-in was cancelled.");
        return;
      }

      const accessToken = result.authentication?.accessToken || result.params?.access_token;
      if (!accessToken) {
        setErrorText("Facebook sign-in failed: missing access token.");
        return;
      }

      await onFacebookLogin(accessToken, role);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Facebook sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell
      title="FYTRAK"
      subtitle="Create your account"
      titleStyle={styles.centeredHeader}
      subtitleStyle={styles.centeredHeader}
      contentStyle={styles.contentTight}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Typography variant="label">Name</Typography>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#8C93A3"
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="ex: Name@gmail.com"
              placeholderTextColor="#8C93A3"
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone (Optional)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="ex: 99 000 555"
              placeholderTextColor="#8C93A3"
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Min 6 characters"
              placeholderTextColor="#8C93A3"
              style={styles.input}
            />
            {password.length > 0 && password.length < 6 && (
              <Text style={{ color: colors.danger, fontSize: 10, marginLeft: 4 }}>Must be at least 6 characters</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-type password"
              placeholderTextColor="#8C93A3"
              style={styles.input}
            />
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <Text style={{ color: colors.danger, fontSize: 10, marginLeft: 4 }}>Passwords do not match</Text>
            )}
            {confirmPassword.length > 0 && confirmPassword === password && password.length >= 6 && (
              <Text style={{ color: colors.primary, fontSize: 10, marginLeft: 4 }}>Passwords match!</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>I want to join as a...</Text>
            <View style={styles.roleGrid}>
              <Pressable
                style={[styles.roleCard, role === "trainee" && styles.roleCardActive]}
                onPress={() => setRole("trainee")}
              >
                <View style={[styles.roleIconContainer, role === "trainee" && styles.roleIconActive]}>
                  <Ionicons
                    name="fitness-outline"
                    size={24}
                    color={role === "trainee" ? colors.primary : "#8c8c8c"}
                  />
                </View>
                <Text style={[styles.roleLabel, role === "trainee" && styles.roleLabelActive]}>Trainee</Text>
                <Text style={styles.roleSub}>I want to be coached</Text>
              </Pressable>

              <Pressable
                style={[styles.roleCard, role === "coach" && styles.roleCardActive]}
                onPress={() => setRole("coach")}
              >
                <View style={[styles.roleIconContainer, role === "coach" && styles.roleIconActive]}>
                  <Ionicons
                    name="trophy-outline"
                    size={24}
                    color={role === "coach" ? colors.primary : "#8c8c8c"}
                  />
                </View>
                <Text style={[styles.roleLabel, role === "coach" && styles.roleLabelActive]}>Coach</Text>
                <Text style={styles.roleSub}>I want to manage clients</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.termsRow} onPress={() => setAcceptedTerms((prev) => !prev)}>
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
              {acceptedTerms && <Ionicons name="checkmark" size={10} color={colors.primaryText} />}
            </View>
            <Text style={styles.termsText}>
              I understood the <Text style={styles.termsLink}>terms & policy</Text>
            </Text>
          </Pressable>

          <PrimaryButton
            title="Sign up"
            disabled={!canSubmit || isSubmitting}
            onPress={() => void handleSignUp()}
            style={styles.signupBtn}
          />

          {errorText ? <Typography color={colors.danger} style={styles.errorText}>{errorText}</Typography> : null}

          <Text style={styles.socialLabel}>or sign up with</Text>
          <View style={styles.socialRow}>
            <Pressable
              style={[styles.socialIconBtn, isSubmitting && styles.socialIconBtnDisabled]}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Sign up with Google"
              onPress={() => void handleGoogleLogin()}
            >
              <Ionicons name="logo-google" size={24} color="#4285F4" />
            </Pressable>
            <Pressable
              style={[styles.socialIconBtn, isSubmitting && styles.socialIconBtnDisabled]}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Sign up with Facebook"
              onPress={() => void handleFacebookLogin()}
            >
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  contentTight: {
    marginTop: 0,
  },
  centeredHeader: {
    textAlign: "center",
    width: "100%",
  },

  form: {
    marginTop: 20,
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: colors.inputText,
    fontSize: 15,
    borderWidth: 0,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    color: "#8c8c8c",
    fontSize: 13,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  roleGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  roleCard: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    gap: 8,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#1c1d15",
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  roleIconActive: {
    backgroundColor: "#22251a",
  },
  roleLabel: {
    color: "#8c8c8c",
    fontSize: 16,
    fontWeight: "800",
  },
  roleLabelActive: {
    color: colors.primary,
  },
  roleSub: {
    color: "#444",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signupBtn: {
    marginTop: 10,
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontWeight: "800",
    fontSize: 18,
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    fontSize: 13,
  },
  socialLabel: {
    textAlign: "center",
    color: "#8c8c8c",
    marginTop: 10,
    fontSize: 14,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  socialIconBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialIconBtnDisabled: {
    opacity: 0.55,
  },
});


import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { appEnv } from "../../config/env";

WebBrowser.maybeCompleteAuthSession();

type SignUpScreenProps = {
  onSignUp: (payload: { name: string; email: string; password: string; role: "trainee" | "coach" }) => Promise<void>;
  onGoogleLogin: (idToken: string) => Promise<void>;
};

export function SignUpScreen({ onSignUp, onGoogleLogin }: SignUpScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"trainee" | "coach">("trainee");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [request, _response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: appEnv.google.webClientId,
    androidClientId: appEnv.google.androidClientId || appEnv.google.webClientId,
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
    if (!request || isSubmitting) {
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

      await onGoogleLogin(idToken);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell
      title="FYTRAK"
      subtitle="Create your account"
      contentStyle={styles.contentTight}
    >
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nidhal"
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
            placeholder="ex:gymrat@gmail.com"
            placeholderTextColor="#8C93A3"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="ex:+216 99 000 555"
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
            placeholder="***********"
            placeholderTextColor="#8C93A3"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="***********"
            placeholderTextColor="#8C93A3"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>I am a...</Text>
          <View style={styles.roleRow}>
            <Pressable
              style={[styles.rolePill, role === "trainee" && styles.rolePillActive]}
              onPress={() => setRole("trainee")}
            >
              <Ionicons
                name="person"
                size={16}
                color={role === "trainee" ? colors.primary : "#8c8c8c"}
              />
              <Text style={[styles.roleText, role === "trainee" && styles.roleTextActive]}>
                Trainee
              </Text>
            </Pressable>
            <Pressable
              style={[styles.rolePill, role === "coach" && styles.rolePillActive]}
              onPress={() => setRole("coach")}
            >
              <Ionicons
                name="trophy"
                size={16}
                color={role === "coach" ? colors.primary : "#8c8c8c"}
              />
              <Text style={[styles.roleText, role === "coach" && styles.roleTextActive]}>
                Coach
              </Text>
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

        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
          disabled={!canSubmit || isSubmitting}
          onPress={() => void handleSignUp()}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.primaryButtonText}>Sign up</Text>
          )}
        </Pressable>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <Text style={styles.socialLabel}>or sign up with</Text>
        <View style={styles.socialRow}>
          <Pressable style={styles.socialIconBtn} onPress={() => void handleGoogleLogin()}>
            <Ionicons name="logo-google" size={24} color="#4285F4" />
          </Pressable>
          <Pressable style={styles.socialIconBtn} disabled>
            <Ionicons name="logo-facebook" size={24} color="#1877F2" />
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  contentTight: {
    marginTop: 0,
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
  roleRow: {
    flexDirection: "row",
    gap: 12,
  },
  rolePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rolePillActive: {
    borderColor: colors.primary,
    backgroundColor: "#22251a",
  },
  roleText: {
    color: "#8c8c8c",
    fontSize: 15,
    fontWeight: "700",
  },
  roleTextActive: {
    color: colors.primary,
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
});


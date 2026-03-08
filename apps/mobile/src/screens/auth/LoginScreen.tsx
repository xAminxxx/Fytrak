import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { appEnv } from "../../config/env";

WebBrowser.maybeCompleteAuthSession();

type LoginScreenProps = {
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  onGoogleLogin: (idToken: string) => Promise<void>;
};

export function LoginScreen({ onLogin, onGoogleLogin }: LoginScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [request, _response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: appEnv.google.webClientId,
    androidClientId: appEnv.google.androidClientId || appEnv.google.webClientId,
  });

  const canSubmit = useMemo(() => email.trim().includes("@") && password.trim().length >= 6, [email, password]);

  const handleLogin = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText(null);
      await onLogin({ email: email.trim(), password: password.trim() });
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Login failed.");
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
      centered
      title="FYTRAK"
      subtitle="Sign in to continue"
      contentStyle={styles.contentTight}
    >
      <View style={styles.form}>
        <Pressable style={styles.socialButton} onPress={() => void handleGoogleLogin()}>
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text style={styles.socialText}>Sign in with Google</Text>
        </Pressable>

        <Pressable style={styles.socialButton} disabled>
          <Ionicons name="logo-facebook" size={20} color="#1877F2" />
          <Text style={styles.socialText}>Continue with Facebook</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          autoCapitalize="none"
          placeholder="Phone, email, or username"
          placeholderTextColor="#8C93A3"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordWrap}>
          <TextInput
            secureTextEntry
            placeholder="Password..."
            placeholderTextColor="#8C93A3"
            style={styles.inputPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Ionicons name="eye-outline" size={20} color="#8C93A3" style={styles.eyeIcon} />
        </View>

        <Pressable style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
          disabled={!canSubmit || isSubmitting}
          onPress={() => void handleLogin()}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.primaryButtonText}>Login</Text>
          )}
        </Pressable>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.signupLink}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 20,
    gap: 12,
  },
  contentTight: {
    marginTop: 0,
  },

  socialButton: {
    backgroundColor: "#ffffff",
    borderRadius: 30,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#333333",
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 14,
    textTransform: "lowercase",
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.inputText,
    fontSize: 16,
    borderWidth: 0,
  },
  passwordWrap: {
    position: "relative",
    justifyContent: "center",
  },
  inputPassword: {
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    paddingRight: 45,
    color: colors.inputText,
    fontSize: 16,
    borderWidth: 0,
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
  },
  forgotWrap: {
    alignItems: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 10,
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
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  signupText: {
    color: "#8c8c8c",
    fontSize: 14,
  },
  signupLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    fontSize: 13,
  },
});


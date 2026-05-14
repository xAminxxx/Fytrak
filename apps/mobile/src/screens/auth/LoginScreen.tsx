import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import * as WebBrowser from "expo-web-browser";
import { Typography } from "../../components/Typography";
import { PrimaryButton } from "../../components/Button";
import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import { appEnv } from "../../config/env";
import Svg, { Path, Circle } from "react-native-svg";
import { appAuthRedirectUri } from "../../utils/authRedirect";

import { BrandLogo } from "../../components/BrandLogo";

WebBrowser.maybeCompleteAuthSession();

// PREMIUM SVG LOGOS
const GoogleLogo = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </Svg>
);

const FacebookLogo = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="12" fill="#1877F2" />
    <Path
      fill="#ffffff"
      d="M15.12 12.67l.43-2.8h-2.69V8.05c0-.77.38-1.53 1.59-1.53h1.23V4.13s-1.12-.19-2.19-.19c-2.23 0-3.69 1.35-3.69 3.8v2.12H7.33v2.8h2.47v6.79c.5.08 1 .12 1.51.12s1.01-.04 1.51-.12v-6.79h2.3z"
    />
  </Svg>
);

type LoginScreenProps = {
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  onGoogleLogin: (idToken: string) => Promise<void>;
  onFacebookLogin: (accessToken: string) => Promise<void>;
};

export function LoginScreen({ onLogin, onGoogleLogin, onFacebookLogin }: LoginScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [request, _response, promptAsync] = Google.useAuthRequest({
    clientId: appEnv.google.expoClientId || appEnv.google.webClientId,
    webClientId: appEnv.google.webClientId,
    androidClientId: appEnv.google.androidClientId,
    scopes: ["openid", "profile", "email"],
    responseType: ResponseType.IdToken,
    redirectUri: appAuthRedirectUri,
    selectAccount: true,
  });
  const [facebookRequest, _facebookResponse, promptFacebookAsync] = Facebook.useAuthRequest({
    clientId: appEnv.facebook.appId || "missing-facebook-app-id",
    redirectUri: appAuthRedirectUri,
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
    if (!appEnv.google.webClientId || !request) {
      setErrorText("Google Authentication is not configured.");
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorText(null);
      const result = await promptAsync();

      if (result.type !== "success") {
        setErrorText(result.type === "error" ? result.error?.message ?? "Google sign-in failed." : "Google sign-in was cancelled.");
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

      await onFacebookLogin(accessToken);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Facebook sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell
      centered
      title={<BrandLogo width={160} height={75} />}
      subtitle="Sign in to continue"
      titleStyle={styles.centeredHeader}
      subtitleStyle={styles.centeredHeader}
      contentStyle={styles.contentTight}
    >
      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="enter your email"
          placeholderTextColor="#8C93A3"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordWrap}>
          <TextInput
            secureTextEntry={!showPassword}
            placeholder="Password..."
            placeholderTextColor="#8C93A3"
            style={styles.inputPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#8C93A3"
            />
          </Pressable>
        </View>

        <Pressable style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        <PrimaryButton
          title="Login"
          disabled={!canSubmit || isSubmitting}
          onPress={() => void handleLogin()}
          style={styles.loginBtn}
        />

        {errorText ? <Typography color={colors.danger} style={styles.errorText}>{errorText}</Typography> : null}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={[styles.socialButton, isSubmitting && styles.socialButtonDisabled]}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
          onPress={() => void handleGoogleLogin()}
        >
          <GoogleLogo />
          <Typography color="#000" variant="button">Sign in with Google</Typography>
        </Pressable>

        <Pressable
          style={[styles.socialButton, isSubmitting && styles.socialButtonDisabled]}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Continue with Facebook"
          onPress={() => void handleFacebookLogin()}
        >
          <FacebookLogo />
          <Typography color="#000" variant="button">Continue with Facebook</Typography>
        </Pressable>

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
  centeredHeader: {
    textAlign: 'center',
    width: '100%',
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
  socialButtonDisabled: {
    opacity: 0.55,
  },
  socialText: {
    color: "#000000",
    fontWeight: "700",
    letterSpacing: -0.2,
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
  loginBtn: {
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


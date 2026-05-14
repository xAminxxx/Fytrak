import { makeRedirectUri } from "expo-auth-session";

export const appAuthRedirectUri = makeRedirectUri({
  scheme: "fytrak",
  path: "oauthredirect",
  native: "fytrak://oauthredirect",
});

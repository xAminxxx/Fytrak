import { StatusBar } from "expo-status-bar";
import "./src/i18n";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <>
      <RootNavigator />
      <StatusBar style="light" />
    </>
  );
}

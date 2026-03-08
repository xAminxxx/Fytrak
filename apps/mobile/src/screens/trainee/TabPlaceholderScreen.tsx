import { StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";

type TabPlaceholderScreenProps = {
  title: string;
  subtitle: string;
};

export function TabPlaceholderScreen({ title, subtitle }: TabPlaceholderScreenProps) {
  return (
    <ScreenShell title={title} subtitle={subtitle}>
      <View style={styles.panel}>
        <Text style={styles.info}>Screen scaffold ready for Sprint 1 implementation.</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  info: {
    color: "#64748b",
    fontSize: 13,
  },
});

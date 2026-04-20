import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface SectionTitleProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function SectionTitle({ title, icon }: SectionTitleProps) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10, 
    marginTop: 10, 
    marginBottom: 4 
  },
  sectionTitleText: { 
    color: "#ffffff", 
    fontWeight: "800", 
    fontSize: 13, 
    letterSpacing: 0.5 
  },
});

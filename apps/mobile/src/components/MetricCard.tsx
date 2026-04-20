import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "./Typography";

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  unit: string;
  color: string;
}

export const MetricCard = memo(({ icon, label, value, unit, color }: MetricCardProps) => {
  return (
    <View style={styles.metricCard}>
      <View style={styles.header}>
        <Ionicons name={icon} size={16} color={color} />
        <View style={styles.histogram}>
           {[6, 12, 8, 16, 10, 14].map((h, i) => (
             <View 
               key={i} 
               style={[
                 styles.bar, 
                 { height: h, backgroundColor: i === 4 ? color : '#2c2c2e' }
               ]} 
             />
           ))}
        </View>
      </View>
      <View style={styles.content}>
        <Typography variant="metric" color="#fff" style={styles.value}>
          {value} <Typography style={styles.unit}>{unit}</Typography>
        </Typography>
        <Typography variant="label" color="#666" style={styles.label}>
          {label.toUpperCase()}
        </Typography>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#111",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1c1c1e",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  histogram: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
    height: 16,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  content: {
    marginTop: 14,
  },
  value: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 12,
    color: '#444',
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '800',
  },
});

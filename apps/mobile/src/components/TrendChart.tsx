/**
 * TrendChart — Wraps LineChart with the standard Fytrak chart configuration.
 * Eliminates ~70 lines of duplicated LineChart props per chart instance.
 */
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Typography } from "./Typography";
import { colors } from "../theme/colors";

type TrendChartProps = {
  data: any[];
  color: string;
  yAxisOffset?: number;
  height?: number;
  emptyLabel?: string;
};

export function TrendChart({
  data,
  color,
  yAxisOffset = 0,
  height = 200,
  emptyLabel = "Insufficient tracking data",
}: TrendChartProps) {
  const { width: windowWidth } = useWindowDimensions();

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Typography variant="label" color="#444">{emptyLabel}</Typography>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LineChart
        areaChart
        data={data}
        curved
        height={height}
        width={windowWidth - 90}
        initialSpacing={15}
        endSpacing={20}
        spacing={data.length <= 3 ? 80 : data.length <= 7 ? 50 : 35}
        color={color}
        thickness={3}
        startFillColor={`${color}40`}
        endFillColor={`${color}05`}
        startOpacity={0.5}
        endOpacity={0.05}
        yAxisOffset={yAxisOffset}
        noOfSections={4}
        rulesType="dashed"
        rulesColor="#1c1c1e"
        dashWidth={4}
        dashGap={6}
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: "#555", fontSize: 10, fontWeight: "600" }}
        yAxisTextNumberOfLines={1}
        xAxisLabelTextStyle={{ color: "#555", fontSize: 9, fontWeight: "500" }}
        showVerticalLines
        verticalLinesColor="#1a1a1a"
        verticalLinesThickness={1}
        hideDataPoints={false}
        dataPointsColor={color}
        dataPointsRadius={5}
        focusEnabled
        showStripOnFocus
        stripColor={`${color}26`}
        stripWidth={2}
        showTextOnFocus
        unFocusOnPressOut
        focusedDataPointColor="#fff"
        focusedDataPointRadius={7}
        textColor="#aaa"
        textFontSize={10}
        textShiftY={-14}
        pointerConfig={{
          pointerStripColor: `${color}66`,
          pointerStripWidth: 1,
          pointerColor: "#fff",
          radius: 7,
          pointerLabelWidth: 80,
          pointerLabelHeight: 32,
          activatePointersOnLongPress: false,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (items: any) => (
            <View style={styles.pointerBadge}>
              <Text style={styles.pointerText}>{items[0].value} kg</Text>
            </View>
          ),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginLeft: -10,
    alignItems: "center",
  },
  empty: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  pointerBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
    alignSelf: "center",
  },
  pointerText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
  },
});

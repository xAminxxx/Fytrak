/**
 * TrendChart — Wraps LineChart with the standard Fytrak chart configuration.
 * Eliminates ~70 lines of duplicated LineChart props per chart instance.
 */
import { View, Text, StyleSheet, Dimensions } from "react-native";
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
  const { width: windowWidth } = Dimensions.get("window");

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
        width={windowWidth - 85}
        initialSpacing={30}
        endSpacing={30}
        spacing={data.length <= 1 ? 0 : data.length <= 3 ? 120 : data.length <= 7 ? 60 : 45}
        color={color}
        thickness={3}
        startFillColor={`${color}40`}
        endFillColor={`${color}01`}
        startOpacity={0.6}
        endOpacity={0.01}
        yAxisOffset={yAxisOffset}
        noOfSections={4}
        rulesType="solid"
        rulesColor="#1c1c1e"
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: "#777", fontSize: 10, fontWeight: "600" }}
        yAxisTextNumberOfLines={1}
        xAxisLabelTextStyle={{ color: "#777", fontSize: 10, fontWeight: "500" }}
        xAxisLabelsVerticalShift={5}
        showVerticalLines
        verticalLinesColor="#1a1a1a"
        verticalLinesThickness={1}
        hideDataPoints={false}
        dataPointsColor={color}
        dataPointsRadius={4}
        focusEnabled
        showStripOnFocus
        stripColor={`${color}33`}
        stripWidth={2}
        showTextOnFocus
        unFocusOnPressOut
        focusedDataPointColor="#fff"
        focusedDataPointRadius={6}
        textColor="#fff"
        textFontSize={10}
        textShiftY={-14}
        pointerConfig={{
          pointerStripColor: `${color}88`,
          pointerStripWidth: 1,
          pointerColor: "#fff",
          radius: 6,
          pointerLabelWidth: 80,
          pointerLabelHeight: 32,
          activatePointersOnLongPress: false,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (items: any) => (
            <View style={styles.pointerBadge}>
              <Text style={styles.pointerText}>{items[0].value}</Text>
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

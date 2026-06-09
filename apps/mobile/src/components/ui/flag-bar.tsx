import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Brand, Radius } from '@/constants/brand';

/** The Philippine-flag accent bar used across Katiwala screens. */
export function FlagBar({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.bar, style]}>
      <View style={[styles.segment, { backgroundColor: Brand.blue }]} />
      <View style={[styles.segment, { backgroundColor: Brand.red }]} />
      <View style={[styles.segment, { backgroundColor: Brand.yellow }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 5,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  segment: { flex: 1 },
});

import { StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, humanizeCategory, statusColor } from '@/constants/brand';

export interface BadgeProps {
  /** A booking/account status enum value (e.g. "IN_PROGRESS"). */
  status: string;
  /** Override the displayed text; defaults to a humanized status. */
  label?: string;
}

/** Colored status pill driven by the shared `statusColor` mapping. */
export function Badge({ status, label }: BadgeProps) {
  const color = statusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: color + '1A', borderColor: color + '40' }]}>
      <Text style={[styles.text, { color }]}>{label ?? humanizeCategory(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
});

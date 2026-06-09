import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';

/** Horizontal rule with an optional centered label, e.g. "OR". */
export function Divider({ label }: { label?: string }) {
  if (!label) return <View style={styles.rule} />;
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { height: 1, backgroundColor: Brand.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: Brand.border },
  label: { color: Brand.slate, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});

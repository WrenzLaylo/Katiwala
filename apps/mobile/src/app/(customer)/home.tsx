import { StyleSheet, Text, View } from 'react-native';

export default function CustomerHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Customer</Text>
      <Text style={styles.title}>Welcome to Katiwala</Text>
      <Text style={styles.body}>Your customer home screen is ready for booking flows.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  eyebrow: {
    color: '#1A3FB0',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#111',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    color: '#666',
    fontSize: 16,
    lineHeight: 23,
  },
});

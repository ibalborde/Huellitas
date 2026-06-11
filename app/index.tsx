import { StyleSheet, Text, View } from 'react-native';

// Placeholder screen. Replaced in F0.4 when the theme tokens land.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Huellitas
      </Text>
      <Text style={styles.subtitle}>Estamos preparando todo. Volvé pronto.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function AchievementScreen() {
  const { title, icon, description, xp } = useLocalSearchParams<{
    title: string;
    icon: string;
    description: string;
    xp: string;
  }>();

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.confetti}>🎉</Text>
        <Text style={styles.unlocked}>Achievement Unlocked!</Text>
        <Text style={styles.icon}>{icon ?? '🏆'}</Text>
        <Text style={styles.title}>{title ?? 'Achievement'}</Text>
        <Text style={styles.description}>{description ?? ''}</Text>
        {xp && <Text style={styles.xp}>+{xp} XP</Text>}
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Awesome!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#e94560',
  },
  confetti: { fontSize: 50, marginBottom: 8 },
  unlocked: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  icon: { fontSize: 60, marginBottom: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  description: { color: '#aaa', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  xp: { color: '#e94560', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  button: {
    backgroundColor: '#e94560',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

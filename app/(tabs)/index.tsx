import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useProfileStore } from '../../src/stores/useProfileStore';
import { useProgressStore } from '../../src/stores/useProgressStore';
import { DifficultyLevel } from '../../src/models/types';
import {
  LEVEL_NAMES,
  LEVEL_EMOJIS,
  LEVEL_THRESHOLDS,
  getRandomEncouragement,
} from '../../src/models/constants';

const DIFFICULTIES: { key: DifficultyLevel; label: string; color: string; emoji: string }[] = [
  { key: 'beginner', label: 'Beginner', color: '#4CAF50', emoji: '🟢' },
  { key: 'easy', label: 'Easy', color: '#2196F3', emoji: '🔵' },
  { key: 'medium', label: 'Medium', color: '#FF9800', emoji: '🟠' },
  { key: 'hard', label: 'Hard', color: '#F44336', emoji: '🔴' },
];

export default function ClimbScreen() {
  const { profiles, activeProfileId, setActiveProfile } = useProfileStore();
  const { getProgress } = useProgressStore();
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('beginner');

  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const progress = activeProfile ? getProgress(activeProfile.id) : null;

  if (profiles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeEmoji}>🧗</Text>
          <Text style={styles.welcomeTitle}>Welcome to BoulderBuddy!</Text>
          <Text style={styles.welcomeSubtitle}>
            Let's set up your climber profile to get started
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.setupButtonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Switcher */}
      {profiles.length > 1 && (
        <View style={styles.profileSwitcher}>
          {profiles.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.profileChip,
                p.id === activeProfileId && styles.profileChipActive,
              ]}
              onPress={() => setActiveProfile(p.id)}
            >
              <Text style={styles.profileChipText}>
                {p.id === activeProfileId ? '✓ ' : ''}{p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Status Card */}
      {progress && activeProfile && (
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusEmoji}>
              {LEVEL_EMOJIS[progress.level] ?? '🦎'}
            </Text>
            <View style={styles.statusInfo}>
              <Text style={styles.statusName}>{activeProfile.name}</Text>
              <Text style={styles.statusLevel}>
                Level {progress.level + 1} - {LEVEL_NAMES[progress.level] ?? 'Gecko'}
              </Text>
            </View>
            {progress.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {progress.currentStreak}</Text>
              </View>
            )}
          </View>
          <View style={styles.xpBarContainer}>
            <View style={styles.xpBarBg}>
              <View
                style={[
                  styles.xpBarFill,
                  {
                    width: `${Math.min(
                      100,
                      ((progress.xp - (LEVEL_THRESHOLDS[progress.level] ?? 0)) /
                        ((LEVEL_THRESHOLDS[progress.level + 1] ?? 10000) -
                          (LEVEL_THRESHOLDS[progress.level] ?? 0))) *
                        100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.xpText}>{progress.xp} XP</Text>
          </View>
        </View>
      )}

      {/* Difficulty Selector */}
      <Text style={styles.sectionTitle}>Select Difficulty</Text>
      <View style={styles.difficultyGrid}>
        {DIFFICULTIES.map((d) => (
          <TouchableOpacity
            key={d.key}
            style={[
              styles.difficultyCard,
              { borderColor: d.color },
              selectedDifficulty === d.key && { backgroundColor: d.color + '30' },
            ]}
            onPress={() => setSelectedDifficulty(d.key)}
          >
            <Text style={styles.difficultyEmoji}>{d.emoji}</Text>
            <Text style={[styles.difficultyLabel, { color: d.color }]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Take Photo Button */}
      <TouchableOpacity
        style={styles.cameraButton}
        onPress={() =>
          router.push({
            pathname: '/camera',
            params: { difficulty: selectedDifficulty },
          })
        }
      >
        <Text style={styles.cameraButtonEmoji}>📸</Text>
        <Text style={styles.cameraButtonText}>Take a Photo</Text>
        <Text style={styles.cameraButtonSubtext}>
          Point at the climbing wall
        </Text>
      </TouchableOpacity>

      <Text style={styles.encouragement}>{getRandomEncouragement()}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  welcomeEmoji: { fontSize: 80, marginBottom: 20 },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 32,
  },
  setupButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
  },
  setupButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profileSwitcher: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  profileChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
  },
  profileChipActive: {
    backgroundColor: '#0f3460',
    borderColor: '#e94560',
  },
  profileChipText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statusCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusEmoji: { fontSize: 36, marginRight: 12 },
  statusInfo: { flex: 1 },
  statusName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statusLevel: { color: '#aaa', fontSize: 14 },
  streakBadge: {
    backgroundColor: '#e94560',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  streakText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  xpBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  xpBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#e94560',
    borderRadius: 4,
  },
  xpText: { color: '#aaa', fontSize: 12, fontWeight: '600', width: 60, textAlign: 'right' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  difficultyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  difficultyCard: {
    width: '47%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  difficultyEmoji: { fontSize: 24, marginBottom: 4 },
  difficultyLabel: { fontSize: 14, fontWeight: 'bold' },
  cameraButton: {
    backgroundColor: '#e94560',
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cameraButtonEmoji: { fontSize: 40, marginBottom: 8 },
  cameraButtonText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  cameraButtonSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  encouragement: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

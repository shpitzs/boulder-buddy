import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useProfileStore } from '../../src/stores/useProfileStore';
import { useProgressStore } from '../../src/stores/useProgressStore';
import { useAchievementStore } from '../../src/stores/useAchievementStore';
import { ACHIEVEMENTS, LEVEL_NAMES, LEVEL_EMOJIS, LEVEL_THRESHOLDS } from '../../src/models/constants';

export default function ProfileScreen() {
  const { profiles, activeProfileId, addProfile, setActiveProfile, updateProfile } = useProfileStore();
  const { getProgress } = useProgressStore();
  const { isUnlocked } = useAchievementStore();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');

  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const progress = activeProfile ? getProgress(activeProfile.id) : null;

  const handleCreateProfile = () => {
    if (!name.trim()) {
      Alert.alert('Oops', 'Please enter a name!');
      return;
    }
    const h = parseInt(height, 10);
    if (!h || h < 50 || h > 250) {
      Alert.alert('Oops', 'Please enter a valid height (50-250 cm)');
      return;
    }
    addProfile(name.trim(), h);
    setName('');
    setHeight('');
    setShowForm(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Cards */}
      <Text style={styles.sectionTitle}>Climbers</Text>
      {profiles.map((p) => {
        const prog = getProgress(p.id);
        return (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.profileCard,
              p.id === activeProfileId && styles.profileCardActive,
            ]}
            onPress={() => setActiveProfile(p.id)}
          >
            <Text style={styles.avatarEmoji}>
              {LEVEL_EMOJIS[prog.level] ?? '🦎'}
            </Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{p.name}</Text>
              <Text style={styles.profileMeta}>
                {p.heightCm}cm | Level {prog.level + 1} {LEVEL_NAMES[prog.level]}
              </Text>
              <Text style={styles.profileStats}>
                {prog.totalRoutes} routes | {prog.xp} XP
              </Text>
            </View>
            {p.id === activeProfileId && (
              <Text style={styles.activeLabel}>Active</Text>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Add Profile */}
      {!showForm ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.addButtonText}>+ Add Climber</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Climber</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Height (cm)"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            value={height}
            onChangeText={setHeight}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowForm(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleCreateProfile}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Achievements */}
      {activeProfile && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Achievements
          </Text>
          <View style={styles.achievementGrid}>
            {ACHIEVEMENTS.map((a) => {
              const unlocked = isUnlocked(activeProfile.id, a.id);
              return (
                <View
                  key={a.id}
                  style={[
                    styles.achievementCard,
                    !unlocked && styles.achievementLocked,
                  ]}
                >
                  <Text style={[styles.achievementIcon, !unlocked && { opacity: 0.3 }]}>
                    {a.icon}
                  </Text>
                  <Text
                    style={[styles.achievementTitle, !unlocked && { color: '#555' }]}
                    numberOfLines={1}
                  >
                    {a.title}
                  </Text>
                  <Text
                    style={[styles.achievementDesc, !unlocked && { color: '#444' }]}
                    numberOfLines={2}
                  >
                    {a.description}
                  </Text>
                  {unlocked && (
                    <Text style={styles.achievementReward}>+{a.reward.xp} XP</Text>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Edit Height */}
      {activeProfile && (
        <View style={styles.editSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              Alert.prompt?.(
                'Update Height',
                `Current: ${activeProfile.heightCm}cm`,
                (text) => {
                  const h = parseInt(text, 10);
                  if (h >= 50 && h <= 250) {
                    updateProfile(activeProfile.id, { heightCm: h });
                  }
                },
                'plain-text',
                String(activeProfile.heightCm)
              ) ?? Alert.alert('Edit Height', 'Use the profile form to update height.');
            }}
          >
            <Text style={styles.editBtnText}>
              Edit Height ({activeProfile.heightCm}cm)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileCardActive: { borderColor: '#e94560' },
  avatarEmoji: { fontSize: 40, marginRight: 14 },
  profileInfo: { flex: 1 },
  profileName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profileMeta: { color: '#aaa', fontSize: 13, marginTop: 2 },
  profileStats: { color: '#888', fontSize: 12, marginTop: 2 },
  activeLabel: {
    color: '#e94560',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  addButton: {
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  addButtonText: { color: '#e94560', fontSize: 16, fontWeight: '600' },
  formCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 20,
    marginBottom: 10,
  },
  formTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  formButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#aaa', fontSize: 16, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#e94560',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achievementCard: {
    width: '47%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  achievementLocked: { opacity: 0.6 },
  achievementIcon: { fontSize: 32, marginBottom: 6 },
  achievementTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  achievementDesc: { color: '#aaa', fontSize: 11, textAlign: 'center', marginTop: 2 },
  achievementReward: { color: '#e94560', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  editSection: { marginTop: 24 },
  editBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  editBtnText: { color: '#aaa', fontSize: 15 },
});

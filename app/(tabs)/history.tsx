import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useProfileStore } from '../../src/stores/useProfileStore';
import { useRouteStore } from '../../src/stores/useRouteStore';
import { useProgressStore } from '../../src/stores/useProgressStore';

export default function HistoryScreen() {
  const { activeProfileId } = useProfileStore();
  const { getRoutesByProfile } = useRouteStore();
  const { getProgress } = useProgressStore();

  const routes = activeProfileId ? getRoutesByProfile(activeProfileId) : [];
  const progress = activeProfileId ? getProgress(activeProfileId) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Quick Stats */}
      {progress && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{progress.totalRoutes}</Text>
            <Text style={styles.statLabel}>Routes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{progress.totalMoves}</Text>
            <Text style={styles.statLabel}>Moves</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{progress.xp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{progress.longestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>
      )}

      {routes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📷</Text>
          <Text style={styles.emptyTitle}>No routes yet</Text>
          <Text style={styles.emptySubtitle}>
            Take a photo of a climbing wall to get started!
          </Text>
        </View>
      ) : (
        routes.map((route) => (
          <TouchableOpacity
            key={route.id}
            style={styles.routeCard}
            onPress={() => router.push(`/route/${route.id}`)}
          >
            {route.photoUri && (
              <Image
                source={{ uri: route.photoUri }}
                style={styles.routeThumb}
                contentFit="cover"
              />
            )}
            <View style={styles.routeInfo}>
              <View style={styles.routeHeader}>
                <View
                  style={[styles.colorDot, { backgroundColor: route.targetColor }]}
                />
                <Text style={styles.routeDifficulty}>
                  {route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1)}
                </Text>
              </View>
              <Text style={styles.routeMoves}>
                {route.beta.estimatedMoves} moves
              </Text>
              <Text style={styles.routeDate}>
                {new Date(route.completedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.routeXP}>+{route.xpEarned} XP</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e' },
  content: { padding: 16, paddingBottom: 40 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: { color: '#e94560', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#aaa', fontSize: 11, marginTop: 2 },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: '#aaa', fontSize: 15, textAlign: 'center' },
  routeCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  routeThumb: {
    width: 80,
    height: 80,
  },
  routeInfo: {
    flex: 1,
    padding: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeDifficulty: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  routeMoves: { color: '#aaa', fontSize: 13 },
  routeDate: { color: '#666', fontSize: 12, marginTop: 2 },
  routeXP: { color: '#e94560', fontSize: 13, fontWeight: '600', marginTop: 2 },
});

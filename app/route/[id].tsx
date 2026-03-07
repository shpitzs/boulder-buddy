import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRouteStore } from '../../src/stores/useRouteStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRouteById } = useRouteStore();

  const route = id ? getRouteById(id) : undefined;

  if (!route) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Route not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Wall Photo */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: route.photoUri }}
          style={styles.wallImage}
          contentFit="cover"
        />
        {/* Hold markers */}
        {route.holds.map((hold, idx) => (
          <View
            key={hold.id}
            style={[
              styles.holdMarker,
              {
                left: hold.x * SCREEN_WIDTH - 12,
                top: hold.y * (SCREEN_WIDTH * 0.75) - 12,
              },
            ]}
          >
            <Text style={styles.holdNumber}>{idx + 1}</Text>
          </View>
        ))}
      </View>

      {/* Route Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{route.beta.estimatedMoves}</Text>
            <Text style={styles.infoLabel}>Moves</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>
              {route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1)}
            </Text>
            <Text style={styles.infoLabel}>Difficulty</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoValue, { color: '#e94560' }]}>
              +{route.xpEarned}
            </Text>
            <Text style={styles.infoLabel}>XP Earned</Text>
          </View>
        </View>
        <Text style={styles.dateText}>
          {new Date(route.completedAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Beta Replay */}
      <Text style={styles.sectionTitle}>Beta</Text>
      {route.beta.moves.map((move) => (
        <View key={move.stepNumber} style={styles.moveCard}>
          <View style={styles.moveNumber}>
            <Text style={styles.moveNumberText}>{move.stepNumber}</Text>
          </View>
          <View style={styles.moveInfo}>
            <Text style={styles.moveFun}>{move.funInstruction}</Text>
            <Text style={styles.moveDetail}>{move.instruction}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e' },
  content: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#16213e' },
  errorText: { color: '#e94560', fontSize: 18 },
  linkText: { color: '#aaa', fontSize: 14, marginTop: 12 },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    position: 'relative',
  },
  wallImage: { width: '100%', height: '100%' },
  holdMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(233, 69, 96, 0.85)',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdNumber: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  infoCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  infoItem: { alignItems: 'center' },
  infoValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  infoLabel: { color: '#aaa', fontSize: 12, marginTop: 2 },
  dateText: { color: '#666', fontSize: 13, textAlign: 'center' },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  moveCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
  },
  moveNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moveNumberText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  moveInfo: { flex: 1 },
  moveFun: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  moveDetail: { color: '#aaa', fontSize: 13 },
});

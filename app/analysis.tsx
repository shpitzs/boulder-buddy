import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { decodeImageToPixels } from '../src/core/image/pixelAccess';
import { useProfileStore } from '../src/stores/useProfileStore';
import { useProgressStore } from '../src/stores/useProgressStore';
import { useRouteStore } from '../src/stores/useRouteStore';
import { useAchievementStore } from '../src/stores/useAchievementStore';
import { DifficultyLevel, DetectedHold, HsvRange, WallColor } from '../src/models/types';
import { detectHolds, sampleColorAt, estimateWall } from '../src/core/detection/pipeline';
import { buildRangeFromSample } from '../src/core/detection/colorDetection';
import { generateBeta } from '../src/core/analysis/betaGenerator';
import {
  COLOR_PRESETS,
  COLOR_DISPLAY,
  PROCESSING_WIDTH,
  PROCESSING_HEIGHT,
  XP_PER_ROUTE,
  getRandomEncouragement,
} from '../src/models/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.75;

type AnalysisState = 'selecting' | 'processing' | 'results' | 'error';

export default function AnalysisScreen() {
  const { photoUri, difficulty = 'beginner' } = useLocalSearchParams<{
    photoUri: string;
    difficulty: DifficultyLevel;
  }>();

  const { getActiveProfile } = useProfileStore();
  const { completeRoute } = useProgressStore();
  const { saveRoute } = useRouteStore();
  const { checkAndUnlock } = useAchievementStore();
  const { getRoutesByProfile } = useRouteStore();

  const [state, setState] = useState<AnalysisState>('selecting');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [holds, setHolds] = useState<DetectedHold[]>([]);
  const [beta, setBeta] = useState<ReturnType<typeof generateBeta> | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [error, setError] = useState('');
  const [pixels, setPixels] = useState<Uint8Array | null>(null);
  const [wallColor, setWallColor] = useState<WallColor | null>(null);
  const [saved, setSaved] = useState(false);

  const profile = getActiveProfile();

  // Load and process image pixels on mount
  useEffect(() => {
    loadPixels();
  }, []);

  const loadPixels = async () => {
    if (!photoUri) return;
    try {
      // Resize image for processing
      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: PROCESSING_WIDTH, height: PROCESSING_HEIGHT } }],
        { base64: true, format: ImageManipulator.SaveFormat.PNG }
      );

      if (manipulated.base64) {
        const result = decodeImageToPixels(manipulated.base64);
        if (result) {
          setPixels(result.pixels);
          // Estimate wall color once on load, reuse across all detections
          const wall = estimateWall(result.pixels, PROCESSING_WIDTH, PROCESSING_HEIGHT);
          setWallColor(wall);
        } else {
          console.warn('Skia pixel decode returned null');
        }
      }
    } catch (e) {
      console.warn('Failed to load pixels:', e);
    }
  };

  const runDetection = useCallback(
    (colorName: string, colorRange: HsvRange) => {
      if (!pixels || !profile) return;

      setState('processing');
      setSelectedColor(colorName);

      // Use setTimeout to allow UI to update before heavy processing
      setTimeout(() => {
        try {
          const result = detectHolds(
            pixels,
            PROCESSING_WIDTH,
            PROCESSING_HEIGHT,
            colorRange,
            colorName,
            wallColor ?? undefined
          );

          setHolds(result.holds);
          setProcessingTime(result.processingTimeMs);

          if (result.holds.length < 2) {
            setState('error');
            setError(
              `Only found ${result.holds.length} hold(s) for ${colorName}. Try a different color or tap on a hold to pick its exact color.`
            );
            return;
          }

          // Generate beta
          const betaResult = generateBeta(result.holds, profile, difficulty as DifficultyLevel);
          setBeta(betaResult);
          setState('results');
        } catch (e) {
          setState('error');
          setError('Failed to analyze the image. Please try again.');
          console.warn('Detection error:', e);
        }
      }, 50);
    },
    [pixels, profile, difficulty]
  );

  const handleColorSelect = (colorName: string) => {
    const range = COLOR_PRESETS[colorName];
    if (range) {
      runDetection(colorName, range);
    }
  };

  const handleImageTap = (event: any) => {
    if (!pixels || state === 'processing') return;

    // Get tap position normalized to image
    const { locationX, locationY } = event.nativeEvent;
    const normX = locationX / SCREEN_WIDTH;
    const normY = locationY / IMAGE_HEIGHT;

    if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
      const sampled = sampleColorAt(
        pixels,
        PROCESSING_WIDTH,
        PROCESSING_HEIGHT,
        normX,
        normY
      );
      const range = buildRangeFromSample(
        sampled.r, sampled.g, sampled.b,
        undefined, undefined, undefined,
        wallColor ?? undefined
      );
      runDetection('sampled', range);
    }
  };

  const handleComplete = () => {
    if (!profile || !beta || saved) return;

    const result = completeRoute(
      profile.id,
      difficulty as DifficultyLevel,
      beta.estimatedMoves
    );

    const routeId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    saveRoute({
      id: routeId,
      photoUri: photoUri ?? '',
      holds,
      beta,
      targetColor: selectedColor ?? 'unknown',
      difficulty: difficulty as DifficultyLevel,
      completedAt: Date.now(),
      xpEarned: result.xpEarned,
      profileId: profile.id,
    });

    // Check achievements
    const routes = getRoutesByProfile(profile.id);
    const uniqueColors = [...new Set(routes.map((r) => r.targetColor))].length;
    const { getProgress } = useProgressStore.getState();
    const progress = getProgress(profile.id);
    checkAndUnlock(profile.id, progress, uniqueColors);

    setSaved(true);
  };

  if (!photoUri) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No photo provided</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Wall Photo with Hold Overlay */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleImageTap}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photoUri }}
            style={styles.wallImage}
            contentFit="cover"
          />
          {/* Hold markers */}
          {holds.map((hold, idx) => (
            <View
              key={hold.id}
              style={[
                styles.holdMarker,
                {
                  left: hold.x * SCREEN_WIDTH - 12,
                  top: hold.y * IMAGE_HEIGHT - 12,
                },
              ]}
            >
              <Text style={styles.holdNumber}>{idx + 1}</Text>
            </View>
          ))}
          {/* Route lines */}
          {beta &&
            beta.moves.length > 1 &&
            beta.moves.slice(1).map((move, idx) => {
              if (!move.fromHold) return null;
              return (
                <View
                  key={`line-${idx}`}
                  style={[
                    styles.routeLine,
                    {
                      left: move.fromHold.x * SCREEN_WIDTH,
                      top: move.fromHold.y * IMAGE_HEIGHT,
                      width: Math.sqrt(
                        ((move.toHold.x - move.fromHold.x) * SCREEN_WIDTH) ** 2 +
                          ((move.toHold.y - move.fromHold.y) * IMAGE_HEIGHT) ** 2
                      ),
                      transform: [
                        {
                          rotate: `${Math.atan2(
                            (move.toHold.y - move.fromHold.y) * IMAGE_HEIGHT,
                            (move.toHold.x - move.fromHold.x) * SCREEN_WIDTH
                          )}rad`,
                        },
                      ],
                    },
                  ]}
                />
              );
            })}
        </View>
      </TouchableOpacity>

      {/* Color Picker */}
      <Text style={styles.sectionTitle}>
        {state === 'selecting' ? 'Select hold color (or tap a hold)' : 'Hold Color'}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.colorPicker}
        contentContainerStyle={styles.colorPickerContent}
      >
        {Object.entries(COLOR_DISPLAY).map(([name, hex]) => (
          <TouchableOpacity
            key={name}
            style={[
              styles.colorSwatch,
              { backgroundColor: hex },
              selectedColor === name && styles.colorSwatchActive,
            ]}
            onPress={() => handleColorSelect(name)}
          >
            <Text style={styles.colorLabel}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Processing State */}
      {state === 'processing' && (
        <View style={styles.processingCard}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.processingText}>Analyzing wall...</Text>
        </View>
      )}

      {/* Error State */}
      {state === 'error' && (
        <View style={styles.errorCard}>
          <Text style={styles.errorEmoji}>🤔</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>
            Tip: Try tapping directly on a hold in the photo to pick its exact color
          </Text>
        </View>
      )}

      {/* Results */}
      {state === 'results' && beta && (
        <>
          {/* Route Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {beta.moves.length} moves found!
            </Text>
            <Text style={styles.summarySubtitle}>
              Difficulty: {beta.suitability} | {holds.length} holds detected
            </Text>
            {processingTime > 0 && (
              <Text style={styles.processingTimeText}>
                Analyzed in {Math.round(processingTime)}ms
              </Text>
            )}
          </View>

          {/* Beta Moves */}
          <Text style={styles.sectionTitle}>Climbing Beta</Text>
          {beta.moves.map((move) => (
            <View key={move.stepNumber} style={styles.moveCard}>
              <View style={styles.moveNumber}>
                <Text style={styles.moveNumberText}>{move.stepNumber}</Text>
              </View>
              <View style={styles.moveInfo}>
                <Text style={styles.moveFun}>{move.funInstruction}</Text>
                <Text style={styles.moveDetail}>{move.instruction}</Text>
                <View style={styles.moveMetaRow}>
                  <Text style={styles.moveHand}>
                    {move.hand === 'left' ? '🤚 Left' : move.hand === 'right' ? '✋ Right' : '🙌 Either'}
                  </Text>
                  <Text style={styles.moveDifficulty}>
                    {'⭐'.repeat(Math.min(move.difficulty, 5))}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* Complete Route Button */}
          {!saved ? (
            <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
              <Text style={styles.completeBtnText}>
                Route Complete! +{XP_PER_ROUTE[difficulty as DifficultyLevel]} XP
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.savedCard}>
              <Text style={styles.savedEmoji}>🎉</Text>
              <Text style={styles.savedText}>{getRandomEncouragement()}</Text>
              <TouchableOpacity
                style={styles.homeBtn}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.homeBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
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
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  wallImage: {
    width: '100%',
    height: '100%',
  },
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
  routeLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(233, 69, 96, 0.6)',
    transformOrigin: 'left center',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  colorPicker: { marginBottom: 8 },
  colorPickerContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSwatchActive: { borderColor: '#fff', transform: [{ scale: 1.15 }] },
  colorLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  processingCard: {
    margin: 16,
    padding: 32,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
  },
  processingText: { color: '#aaa', fontSize: 16, marginTop: 12 },
  errorCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
  },
  errorEmoji: { fontSize: 40, marginBottom: 12 },
  errorMessage: { color: '#e94560', fontSize: 15, textAlign: 'center', marginBottom: 8 },
  errorHint: { color: '#888', fontSize: 13, textAlign: 'center' },
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  summarySubtitle: { color: '#aaa', fontSize: 14, marginTop: 4 },
  processingTimeText: { color: '#666', fontSize: 12, marginTop: 4 },
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
  moveMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  moveHand: { color: '#888', fontSize: 12 },
  moveDifficulty: { fontSize: 12 },
  completeBtn: {
    margin: 16,
    padding: 20,
    backgroundColor: '#e94560',
    borderRadius: 16,
    alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  savedCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
  },
  savedEmoji: { fontSize: 50, marginBottom: 12 },
  savedText: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 16 },
  homeBtn: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

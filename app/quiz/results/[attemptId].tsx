import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../src/components/ui/Button';
import { Colors } from '../../../src/constants/colors';
import { getAttemptResult } from '../../../src/services/quiz.service';
import { useQuizStore } from '../../../src/stores/quiz.store';
import type { AttemptResult } from '../../../src/types/quiz.types';

export default function ResultsScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const lastResult = useQuizStore((s) => s.lastResult);

  const [result, setResult] = useState<AttemptResult | null>(
    lastResult && lastResult.attemptId === attemptId ? lastResult : null
  );
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!attemptId) return;
    if (result) return; // already have it from store

    getAttemptResult(attemptId)
      .then((r) => {
        if (!active) return;
        if (!r) setError('Could not load results.');
        setResult(r);
      })
      .catch((e: any) => active && setError(e.message ?? 'Failed to load results.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attemptId, result]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }
  if (error || !result) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'No results to show.'}</Text>
        <Button title="Home" onPress={() => router.replace('/(tabs)/home')} />
      </SafeAreaView>
    );
  }

  const passed = result.score >= 50;
  const scoreColor =
    result.score >= 90 ? Colors.gold :
    result.score >= 70 ? Colors.success :
    result.score >= 50 ? Colors.secondary :
    Colors.error;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {result.levelUp ? (
          <View style={styles.levelUpBanner}>
            <Text style={styles.levelUpEmoji}>🎉</Text>
            <Text style={styles.levelUpText}>
              LEVEL UP! {result.levelUp.oldLevel} → {result.levelUp.newLevel}
            </Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>
            {result.score === 100 ? '💯' : passed ? '🎉' : '📖'}
          </Text>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {Math.round(result.score)}%
          </Text>
          <Text style={styles.scoreLabel}>
            {result.correctCount} of {result.totalCount} correct
          </Text>
          <Text style={styles.passText}>
            {passed ? '✅ Passed' : '❌ Try this book again later'}
          </Text>
        </View>

        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Points earned</Text>
          <Text style={styles.pointsValue}>+{result.pointsEarned}</Text>
          {result.pointBreakdown && result.pointBreakdown.passed ? (
            <View style={styles.breakdown}>
              <BreakdownRow
                label={`Base × ${result.pointBreakdown.difficultyMultiplier}× difficulty`}
                value={`${Math.round(result.pointBreakdown.base * result.pointBreakdown.difficultyMultiplier)}`}
              />
              <BreakdownRow
                label={`Accuracy ${Math.round(result.pointBreakdown.accuracyMultiplier * 100)}%`}
                value={`× ${result.pointBreakdown.accuracyMultiplier}`}
              />
              {result.pointBreakdown.readingLevelBonus > 0 ? (
                <BreakdownRow
                  label="Reading-level bonus"
                  value={`+${result.pointBreakdown.readingLevelBonus}`}
                />
              ) : null}
            </View>
          ) : (
            <Text style={styles.pointsHint}>
              Score 50% or higher next time to earn points.
            </Text>
          )}
          {result.newTotalPoints !== undefined ? (
            <Text style={styles.totalPoints}>
              Total: {result.newTotalPoints.toLocaleString()} pts
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Review</Text>
        {result.questionResults.map((q, idx) => (
          <View key={q.questionId} style={styles.qCard}>
            <Text style={styles.qHeader}>
              Question {idx + 1} {q.correct ? '✅' : '❌'}
            </Text>
            <Text style={styles.qText}>{q.questionText}</Text>
            {(['a', 'b', 'c', 'd'] as const).map((letter) => {
              const isCorrect = letter === q.correctAnswer;
              const isYours = letter === q.yourAnswer;
              return (
                <View
                  key={letter}
                  style={[
                    styles.optionPreview,
                    isCorrect && styles.optionCorrect,
                    isYours && !isCorrect && styles.optionWrong,
                  ]}
                >
                  <Text style={[styles.optionLetter, (isCorrect || isYours) && styles.optionLetterEmphasis]}>
                    {letter.toUpperCase()}
                  </Text>
                  <Text style={styles.optionPreviewText}>{q.options[letter]}</Text>
                  {isCorrect ? <Text style={styles.tag}>correct</Text> : null}
                  {isYours && !isCorrect ? <Text style={[styles.tag, styles.tagWrong]}>your answer</Text> : null}
                </View>
              );
            })}
            {q.explanation ? (
              <Text style={styles.explanation}>💡 {q.explanation}</Text>
            ) : null}
          </View>
        ))}

        <View style={{ gap: 10, marginTop: 12 }}>
          <Button title="Back to Home" onPress={() => router.replace('/(tabs)/home')} />
          <Button
            title="Find Another Book"
            variant="secondary"
            onPress={() => router.replace('/(tabs)/search')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40, gap: 14 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    gap: 14,
  },
  levelUpBanner: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  levelUpEmoji: { fontSize: 32 },
  levelUpText: { color: '#0F0F23', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  heroCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroEmoji: { fontSize: 56, marginBottom: 8 },
  scoreText: { fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  scoreLabel: { color: Colors.textMuted, fontSize: 15, marginTop: 4 },
  passText: { color: Colors.text, fontSize: 14, marginTop: 12, fontWeight: '600' },
  pointsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  pointsLabel: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pointsValue: { color: Colors.gold, fontSize: 36, fontWeight: '900' },
  pointsHint: {
    color: Colors.textSubtle,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  totalPoints: { color: Colors.text, fontSize: 13, marginTop: 10, fontWeight: '600' },
  breakdown: {
    width: '100%',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  breakdownLabel: { color: Colors.textMuted, fontSize: 12 },
  breakdownValue: { color: Colors.text, fontSize: 12, fontWeight: '700' },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 2,
  },
  qCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qHeader: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  qText: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 12, lineHeight: 22 },
  optionPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionCorrect: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  optionWrong: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  optionLetter: { color: Colors.textMuted, fontWeight: '800', fontSize: 13, width: 20 },
  optionLetterEmphasis: { color: Colors.text },
  optionPreviewText: { flex: 1, color: Colors.text, fontSize: 13, marginLeft: 4 },
  tag: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagWrong: { color: Colors.error },
  explanation: {
    color: Colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 19,
  },
  errorText: { color: Colors.error, fontSize: 15, textAlign: 'center' },
});

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../src/components/ui/Button';
import { Colors } from '../../../src/constants/colors';
import { fetchProfile } from '../../../src/services/auth.service';
import { submitAttempt } from '../../../src/services/quiz.service';
import { useAuthStore } from '../../../src/stores/auth.store';
import { useQuizStore } from '../../../src/stores/quiz.store';
import type { AnswerLetter } from '../../../src/types/quiz.types';

const LETTERS: AnswerLetter[] = ['a', 'b', 'c', 'd'];

export default function TakeQuizScreen() {
  const router = useRouter();

  const questions = useQuizStore((s) => s.questions);
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const answers = useQuizStore((s) => s.answers);
  const attemptId = useQuizStore((s) => s.attemptId);
  const setAnswer = useQuizStore((s) => s.setAnswer);
  const setLastResult = useQuizStore((s) => s.setLastResult);
  const next = useQuizStore((s) => s.next);
  const prev = useQuizStore((s) => s.prev);
  const reset = useQuizStore((s) => s.reset);

  const userId = useAuthStore((s) => s.session?.user?.id);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!attemptId || questions.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Quiz session expired.</Text>
        <Button title="Back to Search" onPress={() => router.replace('/(tabs)/search')} />
      </SafeAreaView>
    );
  }

  const question = questions[currentIndex];
  const selectedAnswer = answers[question.id];
  const isLast = currentIndex === questions.length - 1;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const progress = (currentIndex + 1) / questions.length;

  async function handleSubmit() {
    if (!attemptId) return;
    if (!allAnswered) {
      Alert.alert(
        'Some questions are blank',
        'Submit anyway? Blank answers count as wrong.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', style: 'destructive', onPress: doSubmit },
        ]
      );
      return;
    }
    doSubmit();
  }

  async function doSubmit() {
    if (!attemptId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitAttempt({ attemptId, answers });
      setLastResult(result);
      // Refresh the cached profile so home/profile screens show updated points + level.
      if (userId) {
        const fresh = await fetchProfile(userId);
        if (fresh) setProfile(fresh);
      }
      const finishedAttemptId = attemptId;
      reset();
      router.replace(`/quiz/results/${finishedAttemptId}` as any);
    } catch (e: any) {
      setSubmitError(e.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Text style={styles.progressLabel}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
        <Pressable onPress={() => confirmExit(router, reset)}>
          <Text style={styles.exitText}>Exit</Text>
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.questionText}>{question.question_text}</Text>

        <View style={styles.options}>
          {LETTERS.map((letter) => {
            const optionText = question[`option_${letter}` as const] as string;
            const isSelected = selectedAnswer === letter;
            return (
              <Pressable
                key={letter}
                onPress={() => setAnswer(question.id, letter)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && !isSelected && styles.optionPressed,
                ]}
              >
                <View style={[styles.letterCircle, isSelected && styles.letterCircleSelected]}>
                  <Text style={[styles.letterText, isSelected && styles.letterTextSelected]}>
                    {letter.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[styles.optionText, isSelected && styles.optionTextSelected]}
                >
                  {optionText}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="secondary"
          onPress={prev}
          disabled={currentIndex === 0}
          style={{ flex: 1 }}
        />
        {isLast ? (
          <Button
            title="Submit"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!selectedAnswer}
            style={{ flex: 1 }}
          />
        ) : (
          <Button
            title="Next"
            onPress={next}
            disabled={!selectedAnswer}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function confirmExit(
  router: ReturnType<typeof useRouter>,
  reset: () => void
) {
  Alert.alert(
    'Exit quiz?',
    'Your progress will be lost.',
    [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Exit',
        style: 'destructive',
        onPress: () => {
          reset();
          router.replace('/(tabs)/search');
        },
      },
    ]
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },
  progressLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  exitText: { color: Colors.textSubtle, fontSize: 14 },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    marginBottom: 18,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  scroll: { paddingBottom: 20 },
  questionText: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 22,
  },
  options: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  optionSelected: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.primary,
  },
  optionPressed: { opacity: 0.85 },
  letterCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  letterCircleSelected: { backgroundColor: Colors.primary },
  letterText: { color: Colors.textMuted, fontWeight: '800', fontSize: 14 },
  letterTextSelected: { color: Colors.text },
  optionText: { flex: 1, color: Colors.text, fontSize: 15, lineHeight: 21 },
  optionTextSelected: { fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, paddingVertical: 14 },
  error: { color: Colors.error, fontSize: 13, textAlign: 'center', marginTop: 6 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    gap: 16,
  },
  errorText: { color: Colors.error, fontSize: 15, textAlign: 'center' },
});

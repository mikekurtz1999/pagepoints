import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { Colors } from '../../src/constants/colors';
import { getBookById } from '../../src/services/books.service';
import {
  getOrCreateQuizForBook,
  getQuestionsForQuiz,
  startAttempt,
} from '../../src/services/quiz.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { useQuizStore } from '../../src/stores/quiz.store';
import type { Book } from '../../src/types/book.types';

export default function BookDetailScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const setActiveQuiz = useQuizStore((s) => s.setActiveQuiz);

  const [book, setBook] = useState<Book | null>(null);
  const [loadingBook, setLoadingBook] = useState(true);
  const [bookError, setBookError] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!bookId) return;
    setLoadingBook(true);
    getBookById(bookId)
      .then((b) => {
        if (!active) return;
        if (!b) setBookError('Book not found.');
        setBook(b);
      })
      .catch((e: any) => active && setBookError(e.message ?? 'Could not load book.'))
      .finally(() => active && setLoadingBook(false));
    return () => {
      active = false;
    };
  }, [bookId]);

  async function handleStartQuiz() {
    if (!book || !session?.user) return;
    setStarting(true);
    setStartError(null);
    try {
      const quiz = await getOrCreateQuizForBook(book);
      const questions = await getQuestionsForQuiz(quiz.id);
      if (questions.length === 0) {
        throw new Error('Quiz has no questions. Please try again.');
      }
      const attemptId = await startAttempt({
        userId: session.user.id,
        quizId: quiz.id,
        bookId: book.id,
      });
      setActiveQuiz({ quizId: quiz.id, attemptId, bookId: book.id, questions });
      router.replace(`/quiz/take/${quiz.id}` as any);
    } catch (e: any) {
      setStartError(e.message ?? 'Could not start the quiz. Try again.');
    } finally {
      setStarting(false);
    }
  }

  if (loadingBook) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }
  if (bookError || !book) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{bookError ?? 'Book not found'}</Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          {book.cover_url ? (
            <Image source={{ uri: book.cover_url }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Text style={{ fontSize: 56 }}>📕</Text>
            </View>
          )}
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>by {book.author}</Text>
          <View style={styles.metaRow}>
            {book.published_year ? <Pill label={`${book.published_year}`} /> : null}
            {book.page_count ? <Pill label={`${book.page_count} pp`} /> : null}
            {book.reading_level ? <Pill label={`Level ${book.reading_level}`} /> : null}
          </View>
        </View>

        {book.description ? (
          <View style={styles.descCard}>
            <Text style={styles.descLabel}>About this book</Text>
            <Text style={styles.descText} numberOfLines={6}>
              {book.description.replace(/<[^>]+>/g, '')}
            </Text>
          </View>
        ) : null}

        <View style={styles.quizCard}>
          <Text style={styles.quizLabel}>READY?</Text>
          <Text style={styles.quizTitle}>Take the comprehension quiz</Text>
          <Text style={styles.quizText}>
            10 multiple-choice questions. You'll get points based on accuracy and book difficulty.
          </Text>
          {startError ? <Text style={styles.error}>{startError}</Text> : null}
          <Button
            title={starting ? 'Generating quiz...' : 'Start Quiz'}
            loading={starting}
            onPress={handleStartQuiz}
            style={{ marginTop: 14 }}
          />
          <Text style={styles.hint}>
            First time on this book? Generation takes ~15 seconds.
          </Text>
        </View>

        <Button
          title="Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    gap: 16,
  },
  header: { alignItems: 'center', marginBottom: 20 },
  cover: { width: 140, height: 210, borderRadius: 10, backgroundColor: Colors.surfaceAlt },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  author: { color: Colors.textMuted, fontSize: 15, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    backgroundColor: Colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  descCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  descLabel: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  descText: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  quizCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  quizLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  quizTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  quizText: { color: Colors.textMuted, fontSize: 14, lineHeight: 20 },
  hint: {
    color: Colors.textSubtle,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: { color: Colors.error, fontSize: 15, textAlign: 'center' },
  error: { color: Colors.error, fontSize: 13, marginTop: 10 },
});

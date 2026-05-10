import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookSearchRow } from '../../src/components/book/BookSearchRow';
import { Colors } from '../../src/constants/colors';
import { searchBooks, upsertBook } from '../../src/services/books.service';
import type { BookSearchResult } from '../../src/types/book.types';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [openingBook, setOpeningBook] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function runSearch(q: string) {
    setSearching(true);
    setError(null);
    try {
      const items = await searchBooks(q);
      setResults(items);
    } catch (e: any) {
      setError(e.message ?? 'Search failed. Try again.');
    } finally {
      setSearching(false);
    }
  }

  async function handlePickBook(book: BookSearchResult) {
    Keyboard.dismiss();
    setOpeningBook(true);
    try {
      const saved = await upsertBook(book);
      router.push(`/quiz/${saved.id}` as any);
    } catch (e: any) {
      setError(e.message ?? 'Could not open this book.');
    } finally {
      setOpeningBook(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a book</Text>
        <Text style={styles.subtitle}>Search a title or author</Text>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="The Hobbit, Stephen King..."
          placeholderTextColor={Colors.textSubtle}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {searching ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : results.length === 0 && query.trim().length >= 2 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No books found.</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyText}>Search for a book you've read</Text>
          <Text style={styles.emptyHint}>
            Type a title or author and we'll find it
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.googleBooksId}
          renderItem={({ item }) => (
            <BookSearchRow book={item} onPress={() => handlePickBook(item)} />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {openingBook ? (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.overlayText}>Loading book...</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  header: { paddingTop: 18, paddingBottom: 16 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '800' },
  subtitle: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, color: Colors.text, fontSize: 16, paddingVertical: 14 },
  error: { color: Colors.error, paddingVertical: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15, textAlign: 'center' },
  emptyHint: { color: Colors.textSubtle, fontSize: 13, marginTop: 6, textAlign: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 35, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: { color: Colors.text, fontSize: 14, marginTop: 12 },
});

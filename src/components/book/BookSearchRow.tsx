import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import type { BookSearchResult } from '../../types/book.types';

interface BookSearchRowProps {
  book: BookSearchResult;
  onPress: () => void;
}

export function BookSearchRow({ book, onPress }: BookSearchRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverEmoji}>📕</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
        <View style={styles.meta}>
          {book.publishedYear ? (
            <Text style={styles.metaText}>{book.publishedYear}</Text>
          ) : null}
          {book.pageCount ? (
            <Text style={styles.metaText}>· {book.pageCount} pp</Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  cover: {
    width: 56,
    height: 84,
    borderRadius: 6,
    backgroundColor: Colors.surfaceAlt,
  },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  coverEmoji: { fontSize: 28 },
  info: { flex: 1, marginLeft: 14 },
  title: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  author: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
  meta: { flexDirection: 'row', marginTop: 6, gap: 4 },
  metaText: { color: Colors.textSubtle, fontSize: 12 },
  chevron: { color: Colors.textMuted, fontSize: 28, marginLeft: 8 },
});

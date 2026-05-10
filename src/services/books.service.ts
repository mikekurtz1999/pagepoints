import axios from 'axios';
import type { Book, BookSearchResult } from '../types/book.types';
import { supabase } from './supabase';

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';

interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    categories?: string[];
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
  };
}

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const params: Record<string, string> = {
    q: trimmed,
    maxResults: '20',
    printType: 'books',
  };
  if (apiKey && apiKey !== 'placeholder_google_books_key') {
    params.key = apiKey;
  }

  const { data } = await axios.get<{ items?: GoogleVolume[] }>(GOOGLE_BOOKS_BASE, { params });
  const items = data.items ?? [];

  return items
    .map((vol) => normalizeVolume(vol))
    .filter((b): b is BookSearchResult => b !== null);
}

function normalizeVolume(vol: GoogleVolume): BookSearchResult | null {
  const info = vol.volumeInfo;
  if (!info?.title) return null;

  const author = info.authors?.[0] ?? 'Unknown Author';
  const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
  const httpsCoverUrl = cover ? cover.replace('http://', 'https://') : null;
  const isbn =
    info.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier ??
    info.industryIdentifiers?.find((i) => i.type === 'ISBN_10')?.identifier ??
    null;
  const yearMatch = info.publishedDate?.match(/^\d{4}/);
  const publishedYear = yearMatch ? parseInt(yearMatch[0], 10) : null;

  return {
    googleBooksId: vol.id,
    title: info.title,
    author,
    coverUrl: httpsCoverUrl,
    description: info.description ?? null,
    pageCount: info.pageCount ?? null,
    publishedYear,
    genres: info.categories ?? [],
    isbn,
  };
}

/**
 * Insert a book into public.books if not already there. Returns the DB row.
 */
export async function upsertBook(result: BookSearchResult): Promise<Book> {
  const { data: existing } = await supabase
    .from('books')
    .select('*')
    .eq('google_books_id', result.googleBooksId)
    .maybeSingle();

  if (existing) return existing as Book;

  const { data: inserted, error } = await supabase
    .from('books')
    .insert({
      title: result.title,
      author: result.author,
      isbn: result.isbn,
      cover_url: result.coverUrl,
      page_count: result.pageCount,
      genre: result.genres,
      description: result.description,
      published_year: result.publishedYear,
      google_books_id: result.googleBooksId,
      reading_level: estimateReadingLevel(result.pageCount),
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to save book: ${error.message}`);
  return inserted as Book;
}

export async function getBookById(bookId: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .maybeSingle();
  if (error) {
    console.warn('[books.service] getBookById error:', error.message);
    return null;
  }
  return data as Book | null;
}

/**
 * Rough reading level estimate based on page count. We'll improve this later
 * with real Lexile data when available.
 */
function estimateReadingLevel(pageCount: number | null): number {
  if (!pageCount) return 4.0;
  if (pageCount < 100) return 2.5;
  if (pageCount < 200) return 4.0;
  if (pageCount < 350) return 5.5;
  if (pageCount < 500) return 7.0;
  return 8.5;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  cover_url: string | null;
  page_count: number | null;
  word_count: number | null;
  reading_level: number | null;
  genre: string[] | null;
  description: string | null;
  published_year: number | null;
  google_books_id: string | null;
  created_at: string;
}

export interface BookSearchResult {
  googleBooksId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  publishedYear: number | null;
  genres: string[];
  isbn: string | null;
}

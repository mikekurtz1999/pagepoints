import { supabase } from './supabase';
import type { Profile } from '../types/user.types';

export async function signUp(params: {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}): Promise<void> {
  const { email, password, username, displayName } = params;

  const trimmedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
    throw new Error('Username must be 3-20 characters: lowercase letters, numbers, or underscore.');
  }

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        username: trimmedUsername,
        display_name: displayName?.trim() || trimmedUsername,
      },
    },
  });

  if (error) throw new Error(prettifyAuthError(error.message));
}

export async function signIn(params: { email: string; password: string }): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email.trim(),
    password: params.password,
  });
  if (error) throw new Error(prettifyAuthError(error.message));
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[auth.service] fetchProfile error:', error.message);
    return null;
  }
  return data as Profile | null;
}

function prettifyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Wrong email or password.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (lower.includes('user already registered')) return 'An account with this email already exists.';
  if (lower.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (lower.includes('unable to validate email')) return 'That email address looks invalid.';
  if (lower.includes('duplicate key value') && lower.includes('username')) {
    return 'That username is already taken — pick a different one.';
  }
  return message;
}

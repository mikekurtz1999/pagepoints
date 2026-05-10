import { useEffect } from 'react';
import { fetchProfile } from '../services/auth.service';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

/**
 * Subscribes to Supabase auth state and keeps the auth store in sync.
 * Call this once in the root layout.
 */
export function useAuthBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let active = true;

    // Read the cached session first — this is fast (AsyncStorage, no network).
    // Mark initialized as soon as we know the auth state, so the UI unblocks.
    // The profile fetch happens in the background and updates the store when done.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitialized(true);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).then((profile) => {
          if (active) setProfile(profile);
        });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).then((profile) => {
          if (active) setProfile(profile);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setInitialized]);
}

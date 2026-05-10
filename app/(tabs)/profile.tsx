import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { RankBorder } from '../../src/components/rank/RankBorder';
import { Colors } from '../../src/constants/colors';
import { RANK_TIER_NAMES, SUBDIVISION_LABELS } from '../../src/constants/ranks';
import { signOut } from '../../src/services/auth.service';
import {
  getOrCreateRankProfile,
  checkAndApplyDecay,
  getRankLabel,
} from '../../src/services/rank.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { useRankStore } from '../../src/stores/rank.store';
import type { RankProfile } from '../../src/types/rank.types';

export default function ProfileScreen() {
  const profile    = useAuthStore((s) => s.profile);
  const session    = useAuthStore((s) => s.session);
  const rankProfile   = useRankStore((s) => s.rankProfile);
  const setRankProfile = useRankStore((s) => s.setRankProfile);
  const [signingOut, setSigningOut] = useState(false);

  // Load rank profile (and apply any pending decay) when the screen mounts.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let active = true;

    (async () => {
      try {
        const rp = await checkAndApplyDecay(userId);
        if (active) setRankProfile(rp);
      } catch {
        // Fallback: create one if it doesn't exist yet
        try {
          const rp = await getOrCreateRankProfile(userId);
          if (active) setRankProfile(rp);
        } catch { /* silently ignore */ }
      }
    })();

    return () => { active = false; };
  }, [session?.user?.id, setRankProfile]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert('Sign out failed', e.message ?? 'Try again.');
    } finally {
      setSigningOut(false);
    }
  }

  const tier      = rankProfile?.tier        ?? 'page_turner';
  const subdiv    = rankProfile?.subdivision ?? 1;
  const theme     = rankProfile?.activeTheme ?? 'original';
  const rankLabel = getRankLabel(tier, subdiv);
  const peakLabel = rankProfile
    ? getRankLabel(rankProfile.peakTier, rankProfile.peakSubdivision)
    : null;

  const initials = (profile?.display_name ?? profile?.username ?? '?')
    .charAt(0)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ── Avatar with rank border ── */}
      <View style={styles.avatarWrap}>
        <RankBorder tier={tier} subdivision={subdiv} theme={theme} size={108}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </RankBorder>

        <Text style={styles.displayName}>{profile?.display_name ?? 'New Reader'}</Text>
        <Text style={styles.username}>@{profile?.username ?? '...'}</Text>

        {/* Rank label under username */}
        <View style={styles.rankLabelRow}>
          <Text style={styles.rankLabelText}>{rankLabel}</Text>
          {rankProfile && rankProfile.rankPoints > 0 && (
            <Text style={styles.rankPoints}> · {rankProfile.rankPoints} pts</Text>
          )}
        </View>

        <Text style={styles.email}>{session?.user?.email}</Text>
      </View>

      {/* ── Stats card ── */}
      <View style={styles.statsCard}>
        <Row label="Total Points"    value={profile?.total_points ?? 0} />
        <Row label="Level"           value={profile?.current_level ?? 1} />
        <Row label="Current Streak"  value={`${profile?.current_streak ?? 0} days`} />
        <Row label="Competitive Rank" value={rankLabel} highlight />
        {peakLabel && peakLabel !== rankLabel && (
          <Row label="Peak Rank" value={peakLabel} />
        )}
        <Row label="Tier" value={profile?.is_premium ? 'Premium ✨' : 'Free'} />
      </View>

      <View style={{ marginTop: 'auto', paddingBottom: 24 }}>
        <Button
          title="Sign Out"
          variant="secondary"
          loading={signingOut}
          onPress={handleSignOut}
        />
      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  avatarWrap:   { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },

  // Avatar fills the RankBorder's inner circle at 100%
  avatar: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: Colors.text, fontSize: 36, fontWeight: '800' },

  displayName: { color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 12 },
  username:    { color: Colors.primary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  email:       { color: Colors.textMuted, fontSize: 13, marginTop: 4 },

  rankLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rankLabelText: { color: Colors.gold, fontSize: 13, fontWeight: '700' },
  rankPoints:    { color: Colors.textMuted, fontSize: 12 },

  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLabel:          { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  rowValue:          { color: Colors.text, fontSize: 15, fontWeight: '700' },
  rowValueHighlight: { color: Colors.gold },
});

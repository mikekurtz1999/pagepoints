import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/auth.store';

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{profile?.display_name ?? profile?.username ?? 'Reader'}</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <Stat label="Points" value={profile?.total_points ?? 0} />
          <Stat label="Level" value={profile?.current_level ?? 1} />
          <Stat label="Streak" value={profile?.current_streak ?? 0} suffix="🔥" />
        </View>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Phase 2 Complete ✓</Text>
        <Text style={styles.placeholderText}>
          Auth wired up. Profile auto-created. Coming next:
        </Text>
        <Text style={styles.bullet}>• Phase 3 — Book search & quiz flow</Text>
        <Text style={styles.bullet}>• Phase 4 — Point calculation</Text>
        <Text style={styles.bullet}>• Phase 5 — Real-time leaderboard</Text>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        {suffix ? <Text style={{ fontSize: 18 }}> {suffix}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  header: { paddingTop: 24, paddingBottom: 20 },
  greeting: { color: Colors.textMuted, fontSize: 15 },
  name: { color: Colors.text, fontSize: 28, fontWeight: '800', marginTop: 2 },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  placeholder: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  placeholderTitle: { color: Colors.success, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  placeholderText: { color: Colors.text, fontSize: 14, marginBottom: 12 },
  bullet: { color: Colors.textMuted, fontSize: 13, marginVertical: 3 },
});

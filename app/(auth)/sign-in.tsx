import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { TextField } from '../../src/components/ui/TextField';
import { Colors } from '../../src/constants/colors';
import { signIn } from '../../src/services/auth.service';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn({ email, password });
    } catch (e: any) {
      setError(e.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.emoji}>📚</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.tagline}>Sign in to keep reading</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              autoComplete="password"
              placeholder="••••••••"
              error={error}
            />
            <Button title="Sign In" loading={loading} onPress={handleSubmit} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Link href="/(auth)/sign-up" replace asChild>
              <Text style={styles.footerLink}>Sign up</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 24 },
  hero: { alignItems: 'center', marginBottom: 36 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  tagline: { color: Colors.textMuted, marginTop: 6, fontSize: 15 },
  form: { marginBottom: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerText: { color: Colors.textMuted, fontSize: 14 },
  footerLink: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
});

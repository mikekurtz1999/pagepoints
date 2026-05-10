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
import { signUp } from '../../src/services/auth.service';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setInfo(null);
    if (!email.trim() || !username.trim() || !password) {
      setError('Fill in all fields to create your account.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp({ email, password, username });
      setInfo("Check your email to confirm your account, then sign in.");
    } catch (e: any) {
      setError(e.message ?? 'Sign up failed. Please try again.');
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
            <Text style={styles.emoji}>🎯</Text>
            <Text style={styles.title}>Join PagePoints</Text>
            <Text style={styles.tagline}>Read. Quiz. Compete.</Text>
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
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="bookworm42"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              error={error}
            />
            {info ? <Text style={styles.info}>{info}</Text> : null}
            <Button title="Create Account" loading={loading} onPress={handleSubmit} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/(auth)/sign-in" replace asChild>
              <Text style={styles.footerLink}>Sign in</Text>
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
  tagline: { color: Colors.primary, marginTop: 6, fontSize: 15, fontWeight: '600' },
  form: { marginBottom: 24 },
  info: {
    color: Colors.success,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerText: { color: Colors.textMuted, fontSize: 14 },
  footerLink: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
});

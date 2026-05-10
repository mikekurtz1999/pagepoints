import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/colors';
import { useAuthBootstrap } from '../src/hooks/useAuthBootstrap';
import { useAuthStore } from '../src/stores/auth.store';

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === '(auth)';
    const onSplash = (segments as unknown as string[]).length === 0;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && (inAuthGroup || onSplash)) {
      router.replace('/(tabs)/home');
    }
  }, [isInitialized, session, segments, router]);

  return null;
}

export default function RootLayout() {
  useAuthBootstrap();
  const isInitialized = useAuthStore((s) => s.isInitialized);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate />
        {isInitialized ? (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

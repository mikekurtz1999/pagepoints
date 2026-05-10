import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '../src/constants/colors';

export default function SplashRedirect() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '../theme';
import { createCheckout, getLicenseStatus } from '../services/licensing';

function daysLeft(dateStr) {
  const d = dateStr ? new Date(dateStr) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function Paywall({ navigation }) {
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState(null);
  const [error, setError] = React.useState('');
  const [paying, setPaying] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const s = await getLicenseStatus();
      setStatus(s);
      if (s?.allowed) {
        navigation.replace('Onboarding');
      }
    } catch (e) {
      setError(e?.message || 'Failed to check license');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const startPay = async (plan) => {
    try {
      setPaying(true);
      setError('');
      const { url } = await createCheckout({ plan });
      if (url) await Linking.openURL(url);
      else setError('Checkout unavailable');
    } catch (e) {
      setError(e?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const left = daysLeft(status?.trialEndsAt);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>GR81 Aqua Access</Text>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={styles.sub}>
              {status?.allowed
                ? 'Access active.'
                : (left != null && left > 0)
                  ? `Trial: ${left} day(s) left`
                  : 'Trial ended. Please choose a plan.'}
            </Text>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable focusable style={[styles.btn, paying && { opacity: 0.6 }]} disabled={paying} onPress={() => startPay('yearly')}>
              <Text style={styles.btnText}>Yearly • €5</Text>
            </Pressable>
            <Pressable focusable style={[styles.btn, paying && { opacity: 0.6 }]} disabled={paying} onPress={() => startPay('lifetime')}>
              <Text style={styles.btnText}>Lifetime • €10</Text>
            </Pressable>
            <Pressable focusable style={styles.secondary} onPress={refresh} disabled={loading || paying}>
              <Text style={styles.secondaryText}>I already paid • Refresh</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  title: { ...theme.text.title, marginBottom: 8 },
  sub: { ...theme.text.body, color: theme.colors.subtext, marginBottom: 16 },
  btn: { backgroundColor: theme.colors.primary, borderRadius: theme.radius, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#000', fontWeight: '700' },
  secondary: { backgroundColor: theme.colors.card, borderRadius: theme.radius, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  secondaryText: { color: theme.colors.text, fontWeight: '700' },
  error: { color: theme.colors.danger, marginBottom: 10 },
});


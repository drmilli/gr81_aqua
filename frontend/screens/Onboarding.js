import React from 'react';
import { View, StyleSheet, Image, ActivityIndicator, ImageBackground } from 'react-native';
import Logo from '../assets/public/logo.png';
import BG from '../assets/public/GR81_AQUA_bg.png';
import { getLoggedOut, getProfile, getToken, applyServerProvider } from '../services/session';
import { applyProfile, getActiveProfileId, getProfiles } from '../services/profiles';
import { getLicenseStatus } from '../services/licensing';

export default function Onboarding({ navigation }) {
  React.useEffect(() => {
    (async () => {
      try {
        const lic = await Promise.race([
          getLicenseStatus().catch(() => ({ allowed: true })),
          new Promise(resolve => setTimeout(() => resolve({ allowed: true }), 5000)),
        ]);
        if (!lic?.allowed) { navigation.replace('Paywall'); return; }
        const loggedOut = await getLoggedOut();
        if (loggedOut) { navigation.replace('Login'); return; }
        const p = await getProfile();
        if (p && (p.type === 'xtream' || p.type === 'm3u')) { navigation.replace('Main'); return; }
        const list = await getProfiles();
        if (Array.isArray(list) && list.length) {
          const active = await getActiveProfileId();
          const pick = active && list.some(x => x.id === active) ? active : list[0].id;
          const ok = await applyProfile(pick);
          if (ok) { navigation.replace('Main'); return; }
        }
        const token = await getToken();
        if (token) {
          await applyServerProvider(token);
          navigation.replace('Main');
          return;
        }
      } catch {}
      navigation.replace('Login');
    })();
  }, [navigation]);

  return (
    <ImageBackground source={BG} style={styles.root} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator color="#00d4ff" size="large" style={styles.spinner} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  content: { alignItems: 'center' },
  logo:    { width: 290, height: 115 },
  spinner: { marginTop: 30 },
});

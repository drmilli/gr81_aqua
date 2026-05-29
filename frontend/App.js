import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { AppState, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import theme from './theme';
import { getLicenseStatus } from './services/licensing';

export default function App() {
  const navRef = React.useMemo(() => createNavigationContainerRef(), []);

  React.useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const s = await getLicenseStatus();
        if (!mounted) return;
        if (!s?.allowed && navRef.isReady()) {
          const cur = navRef.getCurrentRoute()?.name;
          if (cur !== 'Paywall') navRef.navigate('Paywall');
        }
      } catch {}
    };
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') check();
    });
    check();
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [navRef]);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.bg,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    }
  };
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar hidden translucent backgroundColor="transparent" />
        <NavigationContainer ref={navRef} theme={navTheme}>
          <AppNavigator />
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}

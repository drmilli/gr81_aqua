import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Platform, KeyboardAvoidingView, ImageBackground,
} from 'react-native';
import { setToken, applyServerProvider } from '../services/session';
import Logo from '../assets/public/logo.png';
import BG from '../assets/public/GR81_AQUA_bg.png';
import api from '../config/api';

export default function Login({ navigation }) {
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const canLogin = username.trim().length > 0 && password.length > 0;

  const doLogin = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/auth/login', { username: username.trim(), password });
      const { token } = res.data;
      await setToken(token);
      await applyServerProvider(token);
      navigation.replace('Main');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.errors?.[0]?.msg || e?.message || 'Login failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground source={BG} style={styles.root} resizeMode="cover">
      <View style={styles.overlay} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />

          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#7aaac8"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor="#00d4ff"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#7aaac8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            selectionColor="#00d4ff"
            onSubmitEditing={canLogin ? doLogin : undefined}
            returnKeyType="done"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            focusable
            hasTVPreferredFocus={Platform.isTV}
            style={[styles.btn, (!canLogin || submitting) && styles.btnDisabled]}
            onPress={doLogin}
            disabled={!canLogin || submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>LOG IN</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  card: {
    width: 400,
    backgroundColor: 'rgba(6, 16, 38, 0.96)',
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e4a6e',
  },
  logo:   { width: 160, height: 70, marginBottom: 28 },
  input: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#2a5070',
    color: '#e8f4ff',
    fontSize: 15,
    paddingVertical: 13,
    paddingHorizontal: 2,
    marginBottom: 22,
  },
  btn: {
    width: '100%',
    backgroundColor: '#00b8cc',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 56,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 2 },
  error:   { color: '#ff6b6b', fontSize: 12, marginBottom: 10, textAlign: 'center', width: '100%' },
});

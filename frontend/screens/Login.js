import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Platform, KeyboardAvoidingView, ImageBackground,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
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
      const { token, user } = res.data;
      await SecureStore.setItemAsync('gr81aqua_token_v1', token);
      await SecureStore.setItemAsync('gr81aqua_user_v1', JSON.stringify(user));
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
            placeholderTextColor="#4a7090"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor="#00d4ff"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#4a7090"
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
    width: 380,
    backgroundColor: 'rgba(12,30,56,0.85)',
    borderRadius: 18,
    paddingHorizontal: 36,
    paddingVertical: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#17304e',
  },
  logo:   { width: 160, height: 70, marginBottom: 28 },
  input: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3d5c',
    color: '#e8f4ff',
    fontSize: 15,
    paddingVertical: 11,
    paddingHorizontal: 2,
    marginBottom: 20,
  },
  btn: {
    width: '100%',
    backgroundColor: '#00b8cc',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1.8 },
  error:   { color: '#ff6b6b', fontSize: 12, marginBottom: 10, textAlign: 'center', width: '100%' },
});

import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export default function TvButton({
  label,
  onPress,
  hasPreferred,
  style,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  hasPreferred?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      focusable
      hasTVPreferredFocus={!!hasPreferred}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[styles.btn, focused && styles.btnFocused, style]}
    >
      <Text style={[styles.txt, focused && styles.txtFocused, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#263241', borderWidth: 2, borderColor: 'transparent' },
  btnFocused: { borderColor: '#4FC3F7', backgroundColor: '#314056' },
  txt: { color: '#E7EDF5', fontSize: 16, fontWeight: '600' },
  txtFocused: { color: '#FFFFFF' },
});

import { Platform } from 'react-native';
export const TV_SCALE = Platform.isTV ? 1.25 : 1;
export const tvSize = (v: number) => Math.round(v * TV_SCALE);

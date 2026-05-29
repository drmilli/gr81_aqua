import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
let apiBase = extra.apiUrl || '';
apiBase = apiBase.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
if (!apiBase) apiBase = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
if (Platform.OS === 'android' && /^https?:\/\/localhost(?::\d+)?$/i.test(apiBase)) {
  apiBase = apiBase.replace(/\/\/localhost/i, '//10.0.2.2');
}

const api = axios.create({ baseURL: `${apiBase}/api`, timeout: 12000 });

export default api;

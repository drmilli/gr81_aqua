import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  useWindowDimensions, PanResponder, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { getStreamUrl } from '../services/provider';
import { useGlobalTVKeys } from '../src/tv/tv';
import { startRecording, stopRecording, startDeviceRecording, stopDeviceRecording } from '../services/recordings';
import theme from '../theme';

export default function PlayScreen({ route, navigation }) {
  const item = route?.params?.item || {};
  const [source, setSource] = useState(item?.hlsUrl || item?.url || null);
  const [error, setError] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [contentFit, setContentFit] = useState('contain');
  const [useWebView, setUseWebView] = useState(false);
  const [volume, setVolume] = useState(1);
  const speeds = [0.5, 1.0, 1.5, 2.0];
  const [speedIdx, setSpeedIdx] = useState(1);
  const [isLandscape, setIsLandscape] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seekHud, setSeekHud] = useState('');
  const [recordingId, setRecordingId] = useState(null);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recToast, setRecToast] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [durationSec, setDurationSec] = useState(0);

  const candidatesRef = useRef([]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const hasAutoPlayedRef = useRef(false);
  const isFirstSourceRef = useRef(true);
  const hideTimer = useRef(null);
  const seekHudTimer = useRef(null);
  const recToastTimer = useRef(null);
  const brightnessModRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0 });
  const dragging = useRef({ active: false, mode: null, startX: 0, startY: 0, startPosSec: 0, lastVolume: 1 });

  const { width, height } = useWindowDimensions();
  const isWide = width > height;
  const isTV = Platform.isTV === true;

  const typeGuess = useMemo(() => {
    if (item.type) return item.type;
    return (item._source === 'live' || String(item.genre || '').toLowerCase() === 'live') ? 'live' : 'vod';
  }, [item]);
  const resolvedId = useMemo(() => item.id || item.stream_id || item.series_id || null, [item]);

  // ─── Player ────────────────────────────────────────────────────────────────
  const player = useVideoPlayer(
    source ? { uri: source, headers: { 'User-Agent': 'IPTVSmartersPlayer', 'Accept': '*/*' } } : null,
    p => { p.loop = false; }
  );

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: false });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [currentTime, setCurrentTime] = useState(0);

  // ─── Error / fallback ──────────────────────────────────────────────────────
  const handleError = useCallback((msg) => {
    if (candidatesRef.current.length > 0 && candidateIdx < candidatesRef.current.length - 1) {
      const next = candidateIdx + 1;
      setCandidateIdx(next);
      setSource(candidatesRef.current[next]);
      setIsError(false); setError(''); setIsLoaded(false);
      return;
    }
    setIsLoaded(true); setIsError(true);
    const s = String(msg);
    if (s.includes('551') || s.includes('Cleartext') || s.includes('network security') || s.includes('407') || s.includes('405')) {
      setUseWebView(true);
      if (candidatesRef.current.length > 0) setSource(candidatesRef.current[0]);
      setIsError(false); setError(''); setIsLoaded(false);
      return;
    }
    if (s.includes('decoder') || s.includes('hevc') || s.includes('c2.') || s.includes('goldfish')) {
      setError('HEVC (H.265) is not supported on this device/emulator.');
      return;
    }
    setError(s.includes('playback exception') ? 'Playback failed: unsupported format or network error.' : s);
  }, [candidateIdx]);

  // ─── Status transitions ────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'readyToPlay') {
      setIsLoaded(true); setIsError(false); setError('');
      setDurationSec(player.duration || 0);
      if (!hasAutoPlayedRef.current) {
        hasAutoPlayedRef.current = true;
        player.play();
      }
    } else if (status === 'error') {
      handleError(player.error?.message || 'Playback error');
    }
  }, [status]);

  // ─── Source changes ────────────────────────────────────────────────────────
  useEffect(() => {
    // Skip first render — useVideoPlayer already loaded the initial source
    if (isFirstSourceRef.current) { isFirstSourceRef.current = false; return; }
    hasAutoPlayedRef.current = false;
    setIsLoaded(false); setIsError(false); setError('');
    if (source) {
      player.replace({ uri: source, headers: { 'User-Agent': 'IPTVSmartersPlayer', 'Accept': '*/*' } });
    }
  }, [source]);

  // ─── Poll current time & duration from player ─────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const t = player.currentTime;
      if (typeof t === 'number' && !isNaN(t)) setCurrentTime(t);
      const d = player.duration;
      if (typeof d === 'number' && d > 0 && !isNaN(d)) setDurationSec(d);
    }, 500);
    return () => clearInterval(id);
  }, [player]);

  // ─── Resolve URL when not already in item ──────────────────────────────────
  useEffect(() => {
    (async () => {
      if (source) {
        candidatesRef.current = (item?.url && item.url !== source) ? [source, item.url] : [source];
        return;
      }
      try {
        const url = await getStreamUrl({
          id: item.id || item.stream_id || item.series_id,
          type: typeGuess,
          extension: item.container_extension || 'mp4',
        });
        const list = [];
        if (url) {
          list.push(url);
          if (/\.m3u8(\?.*)?$/i.test(url)) {
            list.push(url.replace(/\.m3u8(\?.*)?$/i, typeGuess === 'live' ? '.ts' : '.mp4'));
          } else {
            list.push(url.replace(/\.(mp4|mkv|avi|ts)(\?.*)?$/i, '.m3u8'));
          }
        }
        candidatesRef.current = list.filter(Boolean);
        setCandidateIdx(0);
        if (candidatesRef.current.length > 0) setSource(candidatesRef.current[0]);
      } catch { setError('Unable to resolve stream URL'); }
    })();
  }, [item?.id]);

  useEffect(() => { setCandidateIdx(0); }, [item?.id]);

  // ─── 30s timeout ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (!isLoaded && !error && source) handleError('Stream took too long to start');
    }, 30000);
    return () => clearTimeout(t);
  }, [isLoaded, error, source, handleError]);

  // ─── Brightness module ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try { brightnessModRef.current = await import('expo-brightness'); }
      catch { brightnessModRef.current = null; }
    })();
  }, []);

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      clearTimeout(hideTimer.current);
      clearTimeout(seekHudTimer.current);
    };
  }, []);

  // ─── Auto-hide controls ────────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying && controlsVisible) {
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [isPlaying, controlsVisible]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const showControls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  };

  const formatTime = (sec) => {
    if (!sec || sec <= 0) return '0:00';
    const s = Math.floor(sec);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % speeds.length;
    player.playbackRate = speeds[next];
    setSpeedIdx(next);
  };

  const toggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      }
    } catch {}
  };

  const handleProgressBarPress = (e) => {
    if (!durationSec) return;
    const pct = Math.max(0, Math.min(1, e.nativeEvent.locationX / (width - 48)));
    player.currentTime = pct * durationSec;
    showControls();
  };

  const handleVideoAreaPress = () => {
    setControlsVisible(v => {
      const next = !v;
      clearTimeout(hideTimer.current);
      if (next) hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
      return next;
    });
  };

  const openExternalPlayer = async () => {
    try {
      if (source && await Linking.canOpenURL(source)) Linking.openURL(source);
      else alert('Cannot open this URL');
    } catch { alert('Failed to open external player'); }
  };

  const showRecToast = (msg, type = 'info') => {
    setRecToast({ msg, type });
    clearTimeout(recToastTimer.current);
    recToastTimer.current = setTimeout(() => setRecToast(null), 2500);
  };

  const isLive = (item?.type || typeGuess) === 'live';

  const toggleRecording = async () => {
    if (recordingBusy || !source) return;
    try {
      setRecordingBusy(true);
      if (!recordingId) {
        const title = item?.title || item?.name || 'Recording';
        // VOD/series: download directly on device (avoids IPTV IP-lock on backend)
        // Live TV: server-side recording via backend
        const res = isLive
          ? await startRecording({ streamUrl: source, title })
          : await startDeviceRecording({ streamUrl: source, title });
        setRecordingId(res?.id || null);
        showRecToast('Recording started', 'rec');
      } else {
        if (String(recordingId).startsWith('local_')) {
          await stopDeviceRecording(recordingId);
        } else {
          await stopRecording(recordingId);
        }
        setRecordingId(null);
        showRecToast('Recording saved', 'done');
      }
    } catch (e) {
      showRecToast(e?.message || 'Recording error', 'error');
    } finally {
      setRecordingBusy(false);
    }
  };

  // ─── TV remote ────────────────────────────────────────────────────────────
  const onTVKey = useCallback((evt) => {
    if (!isTV) return;
    const type = evt?.eventType;
    if (!type) return;
    showControls();
    if (type === 'select') {
      isPlaying ? player.pause() : player.play();
    } else if (type === 'left' || type === 'right') {
      const jump = type === 'left' ? -10 : 10;
      player.seekBy(jump);
      setSeekHud(jump < 0 ? '-10s' : '+10s');
      clearTimeout(seekHudTimer.current);
      seekHudTimer.current = setTimeout(() => setSeekHud(''), 800);
    } else if (type === 'back') {
      controlsVisible ? setControlsVisible(false) : navigation.goBack();
    }
  }, [isTV, controlsVisible, navigation, isPlaying, player]);
  useGlobalTVKeys(onTVKey);

  // ─── Pan responder ────────────────────────────────────────────────────────
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt, gs) => {
      dragging.current = { active: true, mode: null, startX: gs.x0, startY: gs.y0, startPosSec: player.currentTime || 0, lastVolume: volume ?? 1 };
    },
    onPanResponderMove: async (evt, gs) => {
      if (!dragging.current.active) return;
      const dx = gs.moveX - dragging.current.startX;
      const dy = gs.moveY - dragging.current.startY;
      if (!dragging.current.mode) {
        if (Math.abs(dx) > 20) dragging.current.mode = 'seek';
        else if (Math.abs(dy) > 20) dragging.current.mode = dragging.current.startX < width / 2 ? 'brightness' : 'volume';
      }
      if (dragging.current.mode === 'seek') {
        setSeekHud(`${dx >= 0 ? '+' : ''}${Math.round(dx / 10)}s`);
      } else if (dragging.current.mode === 'brightness') {
        try {
          const B = brightnessModRef.current;
          if (B) {
            const cur = await B.getBrightnessAsync();
            const next = Math.max(0, Math.min(1, cur + (-dy / height)));
            await B.setBrightnessAsync(next);
            setSeekHud(`Brightness ${Math.round(next * 100)}%`);
          }
        } catch {}
      } else if (dragging.current.mode === 'volume') {
        const next = Math.max(0, Math.min(1, dragging.current.lastVolume + (-dy / height)));
        player.volume = next;
        setVolume(next);
        setSeekHud(`Volume ${Math.round(next * 100)}%`);
      }
    },
    onPanResponderRelease: (evt, gs) => {
      if (!dragging.current.active) return;
      if (dragging.current.mode === 'seek') {
        const deltaSec = (gs.moveX - dragging.current.startX) / 10;
        player.currentTime = Math.max(0, dragging.current.startPosSec + deltaSec);
      }
      clearTimeout(seekHudTimer.current);
      seekHudTimer.current = setTimeout(() => setSeekHud(''), 700);
      dragging.current = { active: false, mode: null, startX: 0, startY: 0, startPosSec: 0, lastVolume: 1 };
    },
  }), [width, height, volume]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const videoStyle = [styles.video, isWide ? { width, height } : { width, height: Math.round(width * 9 / 16) }];
  const progress = durationSec > 0 ? currentTime / durationSec : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.playerArea}>
        {source && (
          useWebView ? (
            <WebView
              style={{ flex: 1, backgroundColor: '#000' }}
              userAgent="IPTVSmartersPlayer"
              source={{ html: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>body{margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;}video{width:100%;height:100%;object-fit:contain;}</style></head><body><video src="${source}" controls autoplay playsinline></video><script>const v=document.querySelector('video');v.addEventListener('playing',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'playing'})));v.addEventListener('error',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:v.error?v.error.message:'Unknown'})));</script></body></html>` }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled domStorageEnabled
              mixedContentMode="always"
              onLoad={() => setIsLoaded(true)}
              onMessage={(e) => {
                try {
                  const d = JSON.parse(e.nativeEvent.data);
                  if (d.type === 'error') handleError('WebView: ' + d.msg);
                  if (d.type === 'playing') setIsLoaded(true);
                } catch {}
              }}
              onError={() => handleError('WebView failed to load')}
            />
          ) : (
            <VideoView
              player={player}
              style={videoStyle}
              contentFit={contentFit}
              nativeControls={false}
            />
          )
        )}

        {!useWebView && (
          <TouchableOpacity style={styles.tapper} activeOpacity={1} onPress={handleVideoAreaPress} />
        )}

        {(controlsVisible || useWebView) && (
          <View pointerEvents="box-none" style={styles.overlay}>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <TouchableOpacity onLongPress={() => setShowDebug(p => !p)}>
                  <Text style={styles.title}>{item?.title || item?.name || 'Now Playing'}</Text>
                </TouchableOpacity>
                {resolvedId != null && <Text style={styles.subId}>ID: {String(resolvedId)}</Text>}
                {useWebView && <Text style={[styles.subId, { color: theme.colors.primary }]}>Web Player Active</Text>}
              </View>
              <TouchableOpacity
                style={[styles.topIconBtn, recordingId && styles.iconBtnRecordOn]}
                onPress={toggleRecording}
              >
                <Ionicons name="radio-button-on" size={20} color={recordingId ? '#ff3b30' : '#fff'} />
              </TouchableOpacity>
            </View>

            {!useWebView && (
              <View style={styles.controls}>
                <View style={styles.progressContainer}>
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <TouchableOpacity activeOpacity={1} style={styles.progressBar} onPress={handleProgressBarPress}>
                    <View style={styles.track} />
                    <View style={[styles.progress, { width: `${progress * 100}%` }]} />
                    <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
                  </TouchableOpacity>
                  <Text style={styles.timeText}>{formatTime(durationSec)}</Text>
                </View>

                <TouchableOpacity style={styles.iconBtn} onPress={() => { isPlaying ? player.pause() : player.play(); }}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setContentFit(p => p === 'contain' ? 'cover' : 'contain')}>
                  <Ionicons name={contentFit === 'contain' ? 'scan' : 'crop'} size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={cycleSpeed}>
                  <Ionicons name="speedometer" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setUseWebView(p => !p)}>
                  <Ionicons name={useWebView ? 'phone-portrait-outline' : 'globe-outline'} size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={toggleOrientation}>
                  <Ionicons name={isLandscape ? 'phone-portrait' : 'phone-landscape'} size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {!!seekHud && (
              <View style={styles.seekHud}>
                <Text style={styles.seekText}>{seekHud}</Text>
              </View>
            )}
          </View>
        )}

        {!isLoaded && !isError && !!source && !useWebView && (
          <View style={styles.loader}><ActivityIndicator size="large" color="#fff" /></View>
        )}
      </View>

      {isError && !!error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(''); setIsError(false); navigation.replace('Play', { item }); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryBtn, { marginTop: 10, backgroundColor: '#444' }]} onPress={() => { setError(''); setIsError(false); setUseWebView(p => !p); }}>
            <Text style={[styles.retryText, { color: '#fff' }]}>{useWebView ? 'Switch to Native' : 'Switch to Web Player'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryBtn, { marginTop: 10, backgroundColor: '#222' }]} onPress={openExternalPlayer}>
            <Text style={[styles.retryText, { color: '#aaa' }]}>Open in External Player</Text>
          </TouchableOpacity>
        </View>
      )}

      {!!recToast && (
        <View style={[styles.recToast, recToast.type === 'rec' && styles.recToastRec, recToast.type === 'error' && styles.recToastError]}>
          {recToast.type === 'rec' && <View style={styles.recDot} />}
          {recToast.type === 'done' && <Ionicons name="checkmark-circle" size={16} color="#4cd964" />}
          {recToast.type === 'error' && <Ionicons name="alert-circle" size={16} color="#ff6b6b" />}
          <Text style={styles.recToastText}>{recToast.msg}</Text>
        </View>
      )}

      {showDebug && (
        <View style={{ position: 'absolute', top: 100, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.85)', padding: 10, borderRadius: 8, zIndex: 9999 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 4 }}>Debug</Text>
          <Text style={{ color: '#ccc', fontSize: 10 }}>Source: {source}</Text>
          <Text style={{ color: '#ccc', fontSize: 10 }}>Status: {status} | Playing: {String(isPlaying)} | Loaded: {String(isLoaded)}</Text>
          <Text style={{ color: '#ccc', fontSize: 10 }}>Time: {currentTime?.toFixed(1)}s / {durationSec?.toFixed(1)}s</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  playerArea: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  video: { backgroundColor: '#111' },
  tapper: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 8, marginRight: 8 },
  topIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  iconBtnRecordOn: { backgroundColor: 'rgba(255,59,48,0.18)' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 12, justifyContent: 'center', marginBottom: 20 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16, paddingHorizontal: 12 },
  progressBar: { flex: 1, height: 20, justifyContent: 'center', marginHorizontal: 8 },
  track: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, width: '100%' },
  progress: { height: 4, backgroundColor: '#ff0000', borderRadius: 2, position: 'absolute' },
  thumb: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', position: 'absolute', marginLeft: -6 },
  timeText: { color: '#fff', fontSize: 12, fontWeight: '600', minWidth: 40, textAlign: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  loader: { position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center' },
  seekHud: { position: 'absolute', top: '50%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 8 },
  recToast: { position: 'absolute', bottom: 80, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(20,20,20,0.92)', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', zIndex: 200 },
  recToastRec: { borderColor: 'rgba(255,59,48,0.5)' },
  recToastError: { borderColor: 'rgba(255,107,107,0.5)' },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff3b30' },
  recToastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 8 },
  subId: { color: '#ccc', fontSize: 12, paddingHorizontal: 12, paddingBottom: 6 },
  errorContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 999 },
  errorText: { color: '#ff6b6b', textAlign: 'center', fontSize: 18, fontWeight: '700', marginBottom: 20 },
  retryBtn: { backgroundColor: '#fff', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  retryText: { color: '#000', fontWeight: '700' },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  useWindowDimensions, PanResponder, Platform, Linking, StatusBar,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { getStreamUrl } from '../services/provider';
import { useGlobalTVKeys } from '../src/tv/tv';
import { startRecording, stopRecording, startDeviceRecording, stopDeviceRecording } from '../services/recordings';

export default function PlayScreen({ route, navigation }) {
  const item = route?.params?.item || {};
  const [source, setSource]               = useState(item?.hlsUrl || item?.url || null);
  const [error, setError]                 = useState('');
  const [isError, setIsError]             = useState(false);
  const [isLoaded, setIsLoaded]           = useState(false);
  const [contentFit, setContentFit]       = useState('contain');
  const [useWebView, setUseWebView]       = useState(false);
  const [volume, setVolume]               = useState(1);
  const speeds                            = [0.5, 1.0, 1.5, 2.0];
  const [speedIdx, setSpeedIdx]           = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seekHud, setSeekHud]             = useState('');
  const [recordingId, setRecordingId]     = useState(null);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recToast, setRecToast]           = useState(null);
  const [showDebug, setShowDebug]         = useState(false);
  const [durationSec, setDurationSec]     = useState(0);
  const [retryKey, setRetryKey]           = useState(0);

  const candidatesRef       = useRef([]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const hasAutoPlayedRef    = useRef(false);
  const isFirstSourceRef    = useRef(true);
  const hideTimer           = useRef(null);
  const seekHudTimer        = useRef(null);
  const recToastTimer       = useRef(null);
  const brightnessModRef    = useRef(null);
  const progressWidthRef    = useRef(300);
  const dragging            = useRef({ active: false, mode: null, startX: 0, startY: 0, startPosSec: 0, lastVolume: 1 });

  const { width, height } = useWindowDimensions();
  const isTV  = Platform.isTV === true;
  const isLive = (item?.type || 'vod') === 'live';

  const typeGuess  = useMemo(() => {
    if (item.type) return item.type;
    return (item._source === 'live' || String(item.genre || '').toLowerCase() === 'live') ? 'live' : 'vod';
  }, [item]);
  const resolvedId = useMemo(() => item.id || item.stream_id || item.series_id || null, [item]);

  // ── Player ───────────────────────────────────────────────────────────────────
  const player = useVideoPlayer(
    source ? { uri: source, headers: { 'User-Agent': 'IPTVSmartersPlayer', Accept: '*/*' } } : null,
    p => { p.loop = false; p.volume = 1; p.muted = false; p.audioMixingMode = 'doNotMix'; }
  );
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: false });
  const { status }    = useEvent(player, 'statusChange',  { status: player.status });
  const [currentTime, setCurrentTime] = useState(0);

  // ── Error / fallback ─────────────────────────────────────────────────────────
  const handleError = useCallback((msg) => {
    // Try next candidate URL first
    if (candidatesRef.current.length > 0 && candidateIdx < candidatesRef.current.length - 1) {
      const next = candidateIdx + 1;
      setCandidateIdx(next);
      setSource(candidatesRef.current[next]);
      setIsError(false); setError(''); setIsLoaded(false);
      return;
    }

    const s = String(msg);

    if (s.includes('decoder') || s.includes('hevc') || s.includes('c2.') || s.includes('goldfish')) {
      setIsLoaded(true); setIsError(true);
      setError('This stream uses H.265/HEVC encoding which is not supported on this device.');
      return;
    }

    setIsLoaded(true); setIsError(true);
    setError('Unable to play this stream. The server may be unavailable or the format is unsupported.');
  }, [candidateIdx]);

  useEffect(() => {
    if (status === 'readyToPlay') {
      setIsLoaded(true); setIsError(false); setError('');
      setDurationSec(player.duration || 0);
      if (!hasAutoPlayedRef.current) { hasAutoPlayedRef.current = true; player.play(); }
    } else if (status === 'error') {
      handleError(player.error?.message || 'Playback error');
    }
  }, [status]);

  useEffect(() => {
    if (isFirstSourceRef.current) { isFirstSourceRef.current = false; return; }
    hasAutoPlayedRef.current = false;
    setIsLoaded(false); setIsError(false); setError('');
    if (!source) return;
    let active = true;
    const isHls = /\.m3u8(\?.*)?$/i.test(source);
    player.replaceAsync({
      uri: source,
      headers: { 'User-Agent': 'IPTVSmartersPlayer', Accept: '*/*' },
      ...(isHls ? { contentType: 'hls' } : {}),
    }).catch(e => {
      if (active) handleError(e?.message || 'Load error');
    });
    return () => { active = false; };
  }, [source, retryKey]);

  useEffect(() => {
    const id = setInterval(() => {
      const t = player.currentTime;
      if (typeof t === 'number' && !isNaN(t)) setCurrentTime(t);
      const d = player.duration;
      if (typeof d === 'number' && d > 0 && !isNaN(d)) setDurationSec(d);
    }, 500);
    return () => clearInterval(id);
  }, [player]);

  // ── Resolve stream URL ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (source) {
        candidatesRef.current = (item?.url && item.url !== source) ? [source, item.url] : [source];
        return;
      }
      try {
        const url = await getStreamUrl({ id: item.id || item.stream_id, type: typeGuess, extension: item.container_extension || 'mp4' });
        const list = [];
        if (url) {
          const base = url.replace(/\.[^.?]+(\?.*)?$/, '');
          const qs   = (url.match(/\?.*$/) || [''])[0];
          if (typeGuess === 'live') {
            // Live: .ts first, then .m3u8
            list.push(`${base}.ts${qs}`, `${base}.m3u8${qs}`);
          } else if (/\.m3u8(\?.*)?$/i.test(url)) {
            // Already HLS
            list.push(url);
          } else {
            // VOD: try HLS first (Xtream servers always support it), then original ext, then mp4
            list.push(`${base}.m3u8${qs}`);
            if (!/\.mp4(\?.*)?$/i.test(url)) list.push(`${base}.mp4${qs}`);
            list.push(url);
          }
        }
        candidatesRef.current = list.filter(Boolean);
        setCandidateIdx(0);
        if (candidatesRef.current.length > 0) setSource(candidatesRef.current[0]);
      } catch { setError('Unable to resolve stream URL'); }
    })();
  }, [item?.id]);

  useEffect(() => { setCandidateIdx(0); }, [item?.id]);

  // ── 30s timeout ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (!isLoaded && !error && source) handleError('Stream took too long to start');
    }, 30000);
    return () => clearTimeout(t);
  }, [isLoaded, error, source, handleError]);

  // ── Brightness module ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try { brightnessModRef.current = await import('expo-brightness'); }
      catch { brightnessModRef.current = null; }
    })();
  }, []);

  // ── Orientation: lock landscape on enter, restore on leave ────────────────────
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
      clearTimeout(hideTimer.current);
      clearTimeout(seekHudTimer.current);
    };
  }, []);

  // ── Auto-hide controls ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying && controlsVisible) {
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
    }
  }, [isPlaying, controlsVisible]);

  // Hide controls 3s after the stream first loads
  useEffect(() => {
    if (isLoaded && !isError) {
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [isLoaded, isError]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const showControls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
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
      const cur = await ScreenOrientation.getOrientationAsync();
      if (cur === ScreenOrientation.Orientation.PORTRAIT_UP || cur === ScreenOrientation.Orientation.PORTRAIT_DOWN) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    } catch {}
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

  const toggleRecording = async () => {
    if (recordingBusy || !source) return;
    try {
      setRecordingBusy(true);
      if (!recordingId) {
        const title = item?.title || item?.name || 'Recording';
        const res = isLive
          ? await startRecording({ streamUrl: source, title })
          : await startDeviceRecording({ streamUrl: source, title });
        setRecordingId(res?.id || null);
        showRecToast('Recording started', 'rec');
      } else {
        String(recordingId).startsWith('local_')
          ? await stopDeviceRecording(recordingId)
          : await stopRecording(recordingId);
        setRecordingId(null);
        showRecToast('Recording saved', 'done');
      }
    } catch (e) {
      showRecToast(e?.message || 'Recording error', 'error');
    } finally {
      setRecordingBusy(false);
    }
  };

  // ── TV remote ─────────────────────────────────────────────────────────────────
  const onTVKey = useCallback((evt) => {
    if (!isTV) return;
    const type = evt?.eventType;
    if (!type) return;
    showControls();
    if (type === 'select') {
      isPlaying ? player.pause() : player.play();
    } else if (type === 'left') {
      player.seekBy(-10); setSeekHud('-10s');
      clearTimeout(seekHudTimer.current); seekHudTimer.current = setTimeout(() => setSeekHud(''), 800);
    } else if (type === 'right') {
      player.seekBy(10); setSeekHud('+10s');
      clearTimeout(seekHudTimer.current); seekHudTimer.current = setTimeout(() => setSeekHud(''), 800);
    } else if (type === 'back') {
      controlsVisible ? setControlsVisible(false) : navigation.goBack();
    }
  }, [isTV, controlsVisible, navigation, isPlaying, player]);
  useGlobalTVKeys(onTVKey);

  // ── Pan responder (seek / volume / brightness + tap) ──────────────────────────
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
        if (Math.abs(dx) > 14) dragging.current.mode = 'seek';
        else if (Math.abs(dy) > 14) dragging.current.mode = dragging.current.startX < width / 2 ? 'brightness' : 'volume';
      }
      if (dragging.current.mode === 'seek') {
        setSeekHud(`${dx >= 0 ? '+' : ''}${Math.round(dx / 8)}s`);
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
        player.volume = next; setVolume(next);
        setSeekHud(`Volume ${Math.round(next * 100)}%`);
      }
    },
    onPanResponderRelease: (evt, gs) => {
      if (!dragging.current.active) return;
      const dx = Math.abs(gs.moveX - dragging.current.startX);
      const dy = Math.abs(gs.moveY - dragging.current.startY);
      if (dx < 8 && dy < 8) {
        // tap — toggle controls
        setControlsVisible(v => {
          const next = !v;
          clearTimeout(hideTimer.current);
          if (next) hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
          return next;
        });
      } else if (dragging.current.mode === 'seek') {
        const deltaSec = (gs.moveX - dragging.current.startX) / 8;
        player.currentTime = Math.max(0, dragging.current.startPosSec + deltaSec);
      }
      clearTimeout(seekHudTimer.current);
      seekHudTimer.current = setTimeout(() => setSeekHud(''), 700);
      dragging.current = { active: false, mode: null, startX: 0, startY: 0, startPosSec: 0, lastVolume: 1 };
    },
  }), [width, height, volume]);

  const progress = durationSec > 0 ? currentTime / durationSec : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* ── Video ── */}
      {source && !useWebView && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          nativeControls={false}
        />
      )}

      {source && useWebView && (
        <WebView
          style={StyleSheet.absoluteFill}
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
      )}

      {/* ── Gesture area (tap + drag) ── */}
      {!useWebView
        ? <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
        : <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}
            onStartShouldSetResponder={() => { showControls(); return false; }} />
      }

      {/* ── Controls overlay ── */}
      {controlsVisible && (
        <>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <TouchableOpacity onLongPress={() => setShowDebug(p => !p)}>
                <Text style={styles.titleTxt} numberOfLines={1}>
                  {item?.title || item?.name || 'Now Playing'}
                </Text>
              </TouchableOpacity>
              {useWebView && <Text style={styles.webLabel}>Web Player Active</Text>}
            </View>

            <TouchableOpacity
              style={[styles.recBtn, recordingId && styles.recBtnOn]}
              onPress={toggleRecording}
              disabled={recordingBusy}
            >
              <View style={[styles.recDot, recordingId && styles.recDotOn]} />
              <Text style={[styles.recLabel, recordingId && styles.recLabelOn]}>REC</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom bar */}
          {!useWebView && (
            <View style={styles.bottomBar}>
              {/* Progress bar (VOD only) */}
              {!isLive && (
                <View style={styles.progressRow}>
                  <Text style={styles.timeTxt}>{formatTime(currentTime)}</Text>
                  <TouchableOpacity
                    style={styles.progressWrap}
                    activeOpacity={1}
                    onLayout={(e) => { progressWidthRef.current = e.nativeEvent.layout.width; }}
                    onPress={(e) => {
                      if (!durationSec) return;
                      const pct = Math.max(0, Math.min(1, e.nativeEvent.locationX / progressWidthRef.current));
                      player.currentTime = pct * durationSec;
                      showControls();
                    }}
                  >
                    <View style={styles.track} />
                    <View style={[styles.trackFilled, { width: `${progress * 100}%` }]} />
                    <View style={[styles.progressDot, { left: `${Math.min(97, progress * 100)}%` }]} />
                  </TouchableOpacity>
                  <Text style={styles.timeTxt}>{formatTime(durationSec)}</Text>
                </View>
              )}

              {/* Buttons row */}
              <View style={styles.btnsRow}>
                {/* Left: playback */}
                <View style={styles.btnsLeft}>
                  {!isLive && (
                    <TouchableOpacity style={styles.btn} onPress={() => { player.seekBy(-10); setSeekHud('-10s'); clearTimeout(seekHudTimer.current); seekHudTimer.current = setTimeout(() => setSeekHud(''), 700); }}>
                      <Ionicons name="play-back" size={19} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.btnMain} onPress={() => isPlaying ? player.pause() : player.play()}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color="#fff" />
                  </TouchableOpacity>
                  {!isLive && (
                    <TouchableOpacity style={styles.btn} onPress={() => { player.seekBy(10); setSeekHud('+10s'); clearTimeout(seekHudTimer.current); seekHudTimer.current = setTimeout(() => setSeekHud(''), 700); }}>
                      <Ionicons name="play-forward" size={19} color="#fff" />
                    </TouchableOpacity>
                  )}
                  {isLive && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveTxt}>LIVE</Text>
                    </View>
                  )}
                </View>

                {/* Right: settings */}
                <View style={styles.btnsRight}>
                  <TouchableOpacity style={styles.btn} onPress={cycleSpeed}>
                    <Text style={styles.speedTxt}>{speeds[speedIdx]}x</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btn} onPress={() => setContentFit(p => p === 'contain' ? 'cover' : 'contain')}>
                    <Ionicons name={contentFit === 'contain' ? 'scan-outline' : 'scan'} size={19} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, useWebView && styles.btnOn]} onPress={() => setUseWebView(p => !p)}>
                    <Ionicons name="globe-outline" size={19} color={useWebView ? '#00b8cc' : '#fff'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btn} onPress={toggleOrientation}>
                    <Ionicons name="phone-landscape-outline" size={19} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </>
      )}

      {/* ── Seek / volume / brightness HUD ── */}
      {!!seekHud && (
        <View style={styles.seekHud}>
          <Text style={styles.seekTxt}>{seekHud}</Text>
        </View>
      )}

      {/* ── Loading ── */}
      {!isLoaded && !isError && !!source && !useWebView && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingTxt}>Loading stream...</Text>
        </View>
      )}

      {/* ── Error ── */}
      {isError && !!error && (
        <View style={styles.errorOverlay}>
          <Ionicons name="alert-circle-outline" size={56} color="#ff6b6b" style={{ marginBottom: 14 }} />
          <Text style={styles.errorTitle}>Playback Error</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.errorBtnPrimary} onPress={() => {
              const url = candidatesRef.current[0] || source;
              setError(''); setIsError(false); setIsLoaded(false);
              setUseWebView(false); setCandidateIdx(0);
              hasAutoPlayedRef.current = false;
              setSource(url);
              setRetryKey(k => k + 1);
            }}>
              <Ionicons name="refresh" size={16} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.errorBtnPrimaryTxt}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.errorBtnAlt} onPress={() => {
              setError(''); setIsError(false); setUseWebView(true);
              setCandidateIdx(0);
              if (candidatesRef.current.length > 0) setSource(candidatesRef.current[0]);
            }}>
              <Ionicons name="globe-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.errorBtnAltTxt}>Try Web Player</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.errorBtnAlt} onPress={openExternalPlayer}>
              <Ionicons name="open-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.errorBtnAltTxt}>External Player</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Recording toast ── */}
      {!!recToast && (
        <View style={[styles.toast, recToast.type === 'rec' && styles.toastRec, recToast.type === 'error' && styles.toastErr]}>
          {recToast.type === 'rec'  && <View style={styles.toastDot} />}
          {recToast.type === 'done' && <Ionicons name="checkmark-circle" size={15} color="#4cd964" />}
          {recToast.type === 'error' && <Ionicons name="alert-circle" size={15} color="#ff6b6b" />}
          <Text style={styles.toastTxt}>{recToast.msg}</Text>
        </View>
      )}

      {/* ── Debug ── */}
      {showDebug && (
        <View style={styles.debug}>
          <Text style={styles.debugLine}>URL: {source}</Text>
          <Text style={styles.debugLine}>Status: {status} | Playing: {String(isPlaying)} | Loaded: {String(isLoaded)}</Text>
          <Text style={styles.debugLine}>Time: {currentTime?.toFixed(1)}s / {durationSec?.toFixed(1)}s</Text>
          <Text style={styles.debugLine}>ID: {String(resolvedId)}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // ── Top bar ───────────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  titleTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  webLabel: {
    color: '#00b8cc',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  recBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexShrink: 0,
  },
  recBtnOn: {
    backgroundColor: 'rgba(255,59,48,0.2)',
    borderColor: 'rgba(255,59,48,0.4)',
  },
  recDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#aaaaaa',
  },
  recDotOn: { backgroundColor: '#ff3b30' },
  recLabel: { color: '#aaaaaa', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  recLabelOn: { color: '#ff3b30' },

  // ── Bottom bar ────────────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  timeTxt: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'center',
  },
  progressWrap: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  track: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 2,
  },
  trackFilled: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#00b8cc',
    borderRadius: 2,
  },
  progressDot: {
    position: 'absolute',
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#00b8cc',
    top: 0, marginTop: -5, marginLeft: -6,
    shadowColor: '#00b8cc',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },

  // Buttons
  btnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnsRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  btn: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnMain: {
    width: 52, height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnOn: { backgroundColor: 'rgba(0,184,204,0.2)' },
  speedTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,59,48,0.18)',
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.35)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ff3b30' },
  liveTxt: { color: '#ff3b30', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  // ── Seek HUD ──────────────────────────────────────────────────────────────────
  seekHud: {
    position: 'absolute',
    top: '50%', alignSelf: 'center',
    marginTop: -26,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 22,
  },
  seekTxt: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // ── Loading ───────────────────────────────────────────────────────────────────
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    gap: 14,
  },
  loadingTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },

  // ── Error ─────────────────────────────────────────────────────────────────────
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.96)',
    padding: 32,
  },
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  errorMsg: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  errorActions: { gap: 10, alignItems: 'center' },
  errorBtnPrimary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#00b8cc',
    borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14,
  },
  errorBtnPrimaryTxt: { color: '#000', fontWeight: '800', fontSize: 15 },
  errorBtnAlt: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: '#2c2c2c',
  },
  errorBtnAltTxt: { color: '#cccccc', fontWeight: '600', fontSize: 14 },

  // ── Toast ─────────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    bottom: 90, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(15,15,15,0.95)',
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  toastRec: { borderColor: 'rgba(255,59,48,0.45)' },
  toastErr: { borderColor: 'rgba(255,107,107,0.45)' },
  toastDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff3b30' },
  toastTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // ── Debug ─────────────────────────────────────────────────────────────────────
  debug: {
    position: 'absolute',
    top: 80, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.92)',
    padding: 12, borderRadius: 8, gap: 4,
    zIndex: 9999,
  },
  debugLine: { color: '#ccc', fontSize: 10 },
});

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, AudioLines, Check, CheckCircle2, Circle, CloudUpload, FileAudio, FolderOpen, Info, LoaderCircle, Pause, Play, RotateCcw, ShieldCheck, Square, Trash2, Upload, Volume2 } from 'lucide-react';
import { addRating, closePass, createSession, deriveSamples, sessionStats, startPass, undoPass } from '@/lib/annotation';
import { importSession, sessionToCsv, sessionToJson } from '@/lib/export';
import { deleteSession, loadSession, loadSessions, saveSession } from '@/lib/persistence';
import type { AnnotationSessionV2, AudioAsset, EmotionTarget, RatingEvent, RecordingPass, ResearchContext } from '@/lib/types';
import { defaultVAInterface, type VAInterfaceProfile } from '@/lib/va-config';
import { defaultAudioLibrary, findAudioDraft, MAX_AUDIO_BYTES, MAX_LOCAL_AUDIO_FILES, parseAudioLibrary, type AudioLibrary, type AudioLibraryClip } from '@/lib/audio-library';
import { useLanguage } from './LanguageProvider';
import AnnotationTimeline, { formatTime } from './AnnotationTimeline';
import VAPlane from './VAPlane';
import styles from './Annotator.module.css';

const MAX_BYTES = MAX_AUDIO_BYTES;
type PreparedAudio = { key: string; asset: AudioAsset; source: string; title: { en: string; 'zh-CN': string }; demoOnly: boolean };
const DEMO: AudioAsset = { id: 'mood-rater-practice-v1', name: 'Sound study · 20 seconds', size: 0, mimeType: 'audio/wav', duration: 20, url: '/demo.wav' };
const clamp = (number: number) => Math.max(0, Math.min(1, number));
const activePass = (session: AnnotationSessionV2 | null) => session?.passes.findLast(pass => !pass.revoked && pass.end === null);
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
const snapshotKey = (session: AnnotationSessionV2 | null) => session ? `${session.id}:${session.revision}:${session.updatedAt}` : '';

async function digest(bytes: ArrayBuffer) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(value => value.toString(16).padStart(2, '0')).join('');
}
async function readAudio(file: Blob, url: string) {
  const duration = await new Promise<number>((resolve, reject) => {
    const media = new Audio();
    const timeout = window.setTimeout(() => finish(new Error('AUDIO_METADATA_TIMEOUT')), 15000);
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      const duration = media.duration;
      media.onloadedmetadata = null; media.onerror = null;
      media.removeAttribute('src'); media.load();
      if (error) reject(error); else resolve(duration);
    };
    media.preload = 'metadata';
    media.onloadedmetadata = () => finish();
    media.onerror = () => finish(new Error('AUDIO_FORMAT_UNSUPPORTED'));
    media.src = url;
  });
  return { duration, sha256: await digest(await file.arrayBuffer()) };
}
async function fetchAudio(url: string): Promise<Blob> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new Error('AUDIO_DOWNLOAD_FAILED');
  if (Number(response.headers.get('Content-Length')) > MAX_BYTES) throw new Error('AUDIO_TOO_LARGE');
  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('AUDIO_TOO_LARGE');
      chunks.push(new Uint8Array(value).buffer);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  return new Blob(chunks, { type: response.headers.get('Content-Type') ?? 'audio/wav' });
}
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function responseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : payload.error?.message ?? `Request failed (${response.status})`);
  return payload as T;
}

export default function Annotator({ research, onSubmitted, interfaceProfile, audioLibrary }: { research?: ResearchContext; onSubmitted?: (assetId: string) => void; interfaceProfile?: VAInterfaceProfile; audioLibrary?: AudioLibrary }) {
  const { locale, t } = useLanguage();
  const [session, setSession] = useState<AnnotationSessionV2 | null>(null);
  const sessionRef = useRef<AnnotationSessionV2 | null>(null);
  const [preview, setPreview] = useState<AnnotationSessionV2 | null>(null);
  const [source, setSource] = useState('');
  const sourceRef = useRef('');
  const objectUrls = useRef(new Set<string>());
  const library = useMemo(() => parseAudioLibrary(audioLibrary ?? defaultAudioLibrary), [audioLibrary]);
  const preparedAudio = useRef(new Map<string, PreparedAudio>());
  const [libraryClips, setLibraryClips] = useState<PreparedAudio[]>([]);
  const [localClips, setLocalClips] = useState<PreparedAudio[]>([]);
  const audioOperation = useRef(false);
  const mounted = useRef(true);
  const mediaRef = useRef<HTMLAudioElement>(null);
  const localFileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<EmotionTarget>(research?.study.emotionTarget ?? 'perceived');
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rating, setRating] = useState<[number, number]>([.5, .5]);
  const ratingRef = useRef<[number, number]>([.5, .5]);
  const [hasInput, setHasInput] = useState(false);
  const [touched, setTouched] = useState(false);
  const [practice, setPractice] = useState(false);
  const practiceRef = useRef(false);
  const practiceBackup = useRef<{ session: AnnotationSessionV2 | null; source: string; time: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saved');
  const [drafts, setDrafts] = useState<AnnotationSessionV2[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [submission, setSubmission] = useState<'idle' | 'sending' | 'ready' | 'error'>('idle');
  const [submittedSnapshot, setSubmittedSnapshot] = useState<{ sessionId: string; revision: number } | null>(null);
  const submissionInFlight = useRef(false);
  const demoInitialized = useRef(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const lastSaved = useRef('');
  const lastReliable = useRef(0);
  const lastFrame = useRef(0);
  const lastCapture = useRef(0);
  const pendingSeek = useRef(0);
  const requestSequence = useRef(0);
  const recording = Boolean(activePass(session));
  const duration = session?.asset.duration ?? 0;
  const configuredProfile = interfaceProfile ?? defaultVAInterface;
  const activeProfile = session?.interfaceProfile ?? configuredProfile;

  const replace = useCallback((next: AnnotationSessionV2 | null) => {
    if (sessionRef.current?.id !== next?.id) { setTouched(false); setRating([.5, .5]); ratingRef.current = [.5, .5]; }
    sessionRef.current = next; setSession(next);
    if (next && !practiceRef.current) setSaveState('saving');
    if (!activePass(next)) setPreview(next);
  }, []);
  const changeSource = useCallback((value: string) => {
    // Queued local clips and the practice backup may still need this URL.
    // URLs are released on failed preparation or when this annotator unmounts.
    sourceRef.current = value; setSource(value);
  }, []);
  const stop = useCallback((reason: RecordingPass['endReason'] = 'stop', time?: number) => {
    const current = sessionRef.current;
    if (!current || !activePass(current)) return;
    const next = closePass(current, time ?? mediaRef.current?.currentTime ?? lastReliable.current, reason ?? 'stop');
    replace(next);
  }, [replace]);
  const persist = useCallback(async (): Promise<boolean> => {
    const value = sessionRef.current;
    if (!value || practiceRef.current) return true;
    const key = snapshotKey(value);
    if (key === lastSaved.current) { setSaveState('saved'); return true; }
    setSaveState('saving');
    try {
      await saveSession(value);
      if (snapshotKey(sessionRef.current) === key) { lastSaved.current = key; setSaveState('saved'); }
      return true;
    } catch { if (snapshotKey(sessionRef.current) === key) setSaveState('error'); return false; }
  }, []);
  const refreshDrafts = useCallback(async () => {
    try {
      const values = await loadSessions();
      setDrafts(values.filter(value => research
        ? value.studyId === research.study.id && value.participantId === research.participantId
        : value.mode !== 'research').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch { setSaveState('error'); }
  }, [research]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void refreshDrafts(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshDrafts]);
  useEffect(() => {
    const autosave = window.setInterval(() => { void persist(); }, 2000);
    return () => { window.clearInterval(autosave); void persist(); };
  }, [persist]);
  useEffect(() => {
    if (recording) return;
    const timeout = window.setTimeout(() => { void persist(); }, 300);
    return () => window.clearTimeout(timeout);
  }, [session, recording, persist]);
  useEffect(() => {
    mounted.current = true;
    const interval = window.setInterval(() => {
      const value = sessionRef.current;
      if (value && activePass(value)) setPreview(closePass(value, lastReliable.current, 'stop'));
    }, 250);
    const visibility = () => {
      if (document.hidden) { stop('hidden', lastReliable.current); mediaRef.current?.pause(); void persist(); }
    };
    document.addEventListener('visibilitychange', visibility);
    const urls = objectUrls.current;
    const sequence = requestSequence.current;
    return () => { mounted.current = false; requestSequence.current = sequence + 1; stop('interrupted', lastReliable.current); void persist(); window.clearInterval(interval); document.removeEventListener('visibilitychange', visibility); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [stop, persist]);
  useEffect(() => {
    if (!recording) return;
    let request = 0;
    lastFrame.current = performance.now();
    const tick = (now: number) => {
      const media = mediaRef.current;
      if (!media || !activePass(sessionRef.current)) return;
      if (now - lastFrame.current > 500) {
        stop('interrupted', lastReliable.current); media.pause();
        setNotice(t('Recording paused because the page was interrupted. Press Record to continue.', '页面运行中断，标注已暂停。请点击「开始标注」继续。'));
        return;
      }
      lastFrame.current = now;
      lastReliable.current = media.currentTime;
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [recording, stop, t]);

  const createForAsset = useCallback((asset: AudioAsset) => {
    let next = createSession(asset, locale, research?.study.emotionTarget ?? target, research ? 'research' : 'free', configuredProfile);
    if (research) next = { ...next, studyId: research.study.id, studyVersion: research.study.version, participantId: research.participantId, researchCode: research.researchCode };
    return next;
  }, [locale, research, target, configuredProfile]);

  async function selectAsset(asset: AudioAsset) {
    if (submissionInFlight.current) return;
    if (sessionRef.current?.asset.id === asset.id && sourceRef.current) return;
    setBusy(true);
    stop(); mediaRef.current?.pause();
    if (!await persist()) { setBusy(false); setError(t('Your current session could not be saved. It is still open here. Export a JSON backup before leaving this session.', '当前会话无法保存，内容仍保留在此页面。请先导出 JSON 备份，再离开此会话。')); return; }
    try {
      const existing = (await loadSessions()).find(value => value.asset.id === asset.id && value.studyId === research?.study.id && value.studyVersion === research?.study.version && value.participantId === research?.participantId);
      if (existing) { await restoreDraft(existing); setBusy(false); return; }
    } catch { setSaveState('error'); }
    replace(createForAsset(asset)); changeSource(asset.url ?? `/api/study/${research?.study.token}/audio/${asset.id}`);
    pendingSeek.current = 0; setCurrentTime(0); lastReliable.current = 0; setHasInput(false); setError(''); setNotice('');
    setSubmittedSnapshot(null); setSubmission('idle'); setBusy(false);
  }
  // Studies intentionally start with a visible asset picker, even with one item.
  const samples = useMemo(() => preview ? deriveSamples(preview) : [], [preview]);
  const stats = useMemo(() => preview ? sessionStats(preview) : { coverage: 0, eventCount: 0, passCount: 0 }, [preview]);

  function audioError(error: unknown) {
    const message = errorText(error);
    if (message === 'AUDIO_FORMAT_UNSUPPORTED') return t('This audio format is not supported by your browser. Try MP3 or WAV.', '此浏览器不支持该音频格式，请尝试 MP3 或 WAV。');
    if (message === 'AUDIO_METADATA_TIMEOUT') return t('Audio metadata could not be read. Try another file.', '无法读取音频信息，请尝试其他文件。');
    if (message === 'AUDIO_TOO_LARGE') return t('Each audio file must be smaller than 100 MB.', '每个音频文件需小于 100 MB。');
    if (message === 'AUDIO_DOWNLOAD_FAILED') return t('The selected audio could not be downloaded. Please try again.', '无法下载所选音频，请重试。');
    return message;
  }
  function validateDuration(duration: number) {
    if (!Number.isFinite(duration) || duration <= 0 || duration > 1800) throw new Error(t('Audio must be between 0 and 30 minutes long.', '音频时长需大于 0，且不超过 30 分钟。'));
  }
  async function saveBeforeSwitch() {
    stop(); mediaRef.current?.pause();
    if (!await persist()) throw new Error(t('Your current session could not be saved. It is still open here. Export a JSON backup before leaving this session.', '当前会话无法保存，内容仍保留在此页面。请先导出 JSON 备份，再离开此会话。'));
  }
  async function prepareLibraryClip(clip: AudioLibraryClip): Promise<PreparedAudio> {
    if (!mounted.current) throw new Error('AUDIO_LOAD_CANCELLED');
    const key = `library:${clip.id}`;
    const cached = preparedAudio.current.get(key);
    if (cached && cached.asset.url === clip.url) return cached;
    const request = requestSequence.current;
    const file = await fetchAudio(clip.url);
    if (!mounted.current || request !== requestSequence.current) throw new Error('AUDIO_LOAD_CANCELLED');
    const url = URL.createObjectURL(file); objectUrls.current.add(url);
    try {
      const metadata = await readAudio(file, url);
      if (!mounted.current || request !== requestSequence.current) throw new Error('AUDIO_LOAD_CANCELLED');
      validateDuration(metadata.duration);
      const item: PreparedAudio = { key, title: clip.title, demoOnly: clip.demoOnly, source: url, asset: { id: `library-${clip.id}`, name: clip.title.en, url: clip.url, size: file.size, mimeType: clip.mimeType, ...metadata } };
      preparedAudio.current.set(key, item);
      setLibraryClips([...preparedAudio.current.values()].filter(item => Boolean(item.asset.url)));
      return item;
    } catch (error) { URL.revokeObjectURL(url); objectUrls.current.delete(url); throw error; }
  }
  async function activateAudio(item: PreparedAudio, reconnect?: AnnotationSessionV2) {
    const request = requestSequence.current;
    await saveBeforeSwitch();
    if (!mounted.current || request !== requestSequence.current) return;
    const current = sessionRef.current;
    const values: AnnotationSessionV2[] = await loadSessions().catch(() => { setSaveState('error'); return []; });
    if (!mounted.current || request !== requestSequence.current) return;
    if (current && !values.some(value => value.id === current.id && value.revision >= current.revision)) values.push(current);
    let candidate = findAudioDraft(values, item.asset);
    // Reconnecting the draft currently on screen must preserve that specific draft,
    // including an imported copy, instead of silently choosing a different revision.
    if (current?.mode === 'free' && current.asset.sha256 === item.asset.sha256 && (reconnect?.id === current.id || current.asset.id === item.asset.id || !current.asset.url && !item.asset.url)) {
      candidate = values.filter(value => value.id === current.id).sort((a, b) => b.revision - a.revision)[0] ?? current;
    }
    const open = activePass(candidate ?? null);
    if (candidate && open) candidate = closePass(candidate, open.events.at(-1)?.mediaTime ?? open.start, 'interrupted');
    const next = candidate ? { ...candidate, asset: { ...candidate.asset, duration: item.asset.duration, size: item.asset.size, mimeType: item.asset.mimeType }, revision: candidate.revision + 1, updatedAt: new Date().toISOString() } : createForAsset(item.asset);
    replace(next); changeSource(item.source); pendingSeek.current = 0; setCurrentTime(0); lastReliable.current = 0;
    setTarget(next.emotionTarget === 'felt' ? 'felt' : 'perceived'); setHasInput(false); setSubmission('idle'); setSubmittedSnapshot(null); setShowDrafts(false);
    setNotice(candidate ? t('Audio reconnected. This clip’s annotations are restored.', '音频已重新关联，此音频的标注已恢复。') : t('Ready. This clip has its own annotation and export.', '音频已就绪。每段音频分别记录和导出标注。'));
  }
  async function selectClip(key: string) {
    if (!key || audioOperation.current || submissionInFlight.current || practiceRef.current) return;
    audioOperation.current = true; setBusy(true); setError('');
    const request = requestSequence.current;
    try {
      await saveBeforeSwitch();
      if (!mounted.current || request !== requestSequence.current) return;
      const clip = library.clips.find(clip => `library:${clip.id}` === key);
      const item = clip ? await prepareLibraryClip(clip) : preparedAudio.current.get(key);
      if (item) await activateAudio(item);
    } catch (error) { if (errorText(error) !== 'AUDIO_LOAD_CANCELLED') setError(audioError(error)); }
    finally { audioOperation.current = false; if (mounted.current) setBusy(false); }
  }
  async function loadLocal(files: File[]) {
    if (!files.length || audioOperation.current || submissionInFlight.current || practiceRef.current) return;
    audioOperation.current = true; setBusy(true); setError('');
    const request = requestSequence.current;
    const added: PreparedAudio[] = [], failures: string[] = [];
    try {
      await saveBeforeSwitch();
      if (!mounted.current || request !== requestSequence.current) return;
      for (const file of files.slice(0, MAX_LOCAL_AUDIO_FILES)) {
        if (!mounted.current || request !== requestSequence.current) return;
        if (file.size > MAX_BYTES) { failures.push(`${file.name}: ${audioError(new Error('AUDIO_TOO_LARGE'))}`); continue; }
        const url = URL.createObjectURL(file); objectUrls.current.add(url);
        try {
          const metadata = await readAudio(file, url);
          if (!mounted.current || request !== requestSequence.current) throw new Error('AUDIO_LOAD_CANCELLED');
          validateDuration(metadata.duration);
          const key = `local:${metadata.sha256}`;
          const existing = preparedAudio.current.get(key);
          if (existing) { URL.revokeObjectURL(url); objectUrls.current.delete(url); added.push(existing); continue; }
          if ([...preparedAudio.current.values()].filter(item => !item.asset.url).length >= MAX_LOCAL_AUDIO_FILES) throw new Error(t('The local playlist is limited to 20 files per tab.', '每个页面最多添加 20 个本地音频。'));
          const item: PreparedAudio = { key, asset: { id: `local-${metadata.sha256}`, name: file.name, size: file.size, mimeType: file.type || 'audio/unknown', ...metadata }, source: url, title: { en: file.name, 'zh-CN': file.name }, demoOnly: false };
          preparedAudio.current.set(key, item); added.push(item);
        } catch (error) {
          URL.revokeObjectURL(url); objectUrls.current.delete(url);
          if (!mounted.current || request !== requestSequence.current || errorText(error) === 'AUDIO_LOAD_CANCELLED') return;
          failures.push(`${file.name}: ${audioError(error)}`);
        }
      }
      if (files.length > MAX_LOCAL_AUDIO_FILES) failures.push(t('Only the first 20 selected files were considered.', '本次仅处理前 20 个所选文件。'));
      setLocalClips([...preparedAudio.current.values()].filter(item => !item.asset.url));
      const current = sessionRef.current;
      const reconnect = current?.mode === 'free' && current.asset.sha256 && !sourceRef.current;
      const selected = reconnect ? added.find(item => item.asset.sha256 === current.asset.sha256) : added[0];
      if (selected) await activateAudio(selected, reconnect ? current : undefined);
      else if (reconnect && added.length) failures.push(t('The draft is still open. Select its original audio file to reconnect, or choose another clip in the playlist.', '草稿仍保留在此处。请选择原音频重新关联，或从列表中切换到其他音频。'));
      if (failures.length) setError(failures.slice(0, 3).join(' · '));
    } catch (error) { setError(audioError(error)); }
    finally { audioOperation.current = false; if (request === requestSequence.current) setBusy(false); if (localFileRef.current) localFileRef.current.value = ''; }
  }

  async function togglePlayback() {
    const media = mediaRef.current; if (!media || !source) return;
    if (!media.paused) { stop('pause'); media.pause(); }
    else { try { await media.play(); } catch { setError(t('Playback could not start. Try another audio format.', '无法开始播放，请尝试其他音频格式。')); } }
  }
  async function toggleRecording() {
    const media = mediaRef.current, current = sessionRef.current;
    if (!media || !current || !source) return;
    if (activePass(current)) { stop('stop'); media.pause(); await persist(); return; }
    setError(''); setNotice('');
    if (media.currentTime >= current.asset.duration - .01) media.currentTime = 0;
    try {
      await media.play();
      if (sessionRef.current?.id !== current.id) return;
      lastReliable.current = media.currentTime;
      replace(startPass(sessionRef.current!, media.currentTime));
      setHasInput(false); lastCapture.current = 0;
    } catch { setError(t('Playback could not start. Check your audio file and try again.', '无法播放，请检查音频文件后重试。')); }
  }
  function seek(time: number) {
    const media = mediaRef.current; if (!media || !source) return;
    stop('seek', media.currentTime); media.pause(); media.currentTime = time;
    lastReliable.current = time; setCurrentTime(time); setHasInput(false);
  }
  function capture(v: number, a: number, input: RatingEvent['input'], force = false) {
    if (busy || submissionInFlight.current) return;
    const nextRating: [number, number] = [clamp(v), clamp(a)];
    ratingRef.current = nextRating; setRating(nextRating); setTouched(true);
    const current = sessionRef.current, media = mediaRef.current;
    if (!current || !media || !activePass(current) || media.paused || media.seeking) return;
    const now = performance.now();
    if (!force && now - lastCapture.current < 1000 / 30) return;
    lastCapture.current = now; setHasInput(true);
    replace(addRating(current, media.currentTime, now, nextRating[0], nextRating[1], input));
  }
  const startPractice = useCallback(() => {
    if (submissionInFlight.current || practiceRef.current) return;
    stop(); mediaRef.current?.pause(); void persist();
    practiceBackup.current = { session: sessionRef.current, source: sourceRef.current, time: mediaRef.current?.currentTime ?? 0 };
    practiceRef.current = true; setPractice(true);
    pendingSeek.current = 0; replace(createSession(DEMO, locale, target, 'free', configuredProfile)); changeSource(DEMO.url!); setCurrentTime(0); lastReliable.current = 0;
    setError(''); setNotice(''); setHasInput(false);
  }, [stop, persist, locale, target, replace, changeSource, configuredProfile, setCurrentTime, setError, setNotice]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (demoInitialized.current) return;
      demoInitialized.current = true;
      if (!sessionRef.current && new URLSearchParams(window.location.search).get('demo') === '1') startPractice();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [startPractice]);
  function finishPractice() {
    stop(); mediaRef.current?.pause();
    const backup = practiceBackup.current;
    practiceRef.current = false; setPractice(false); practiceBackup.current = null;
    pendingSeek.current = backup?.time ?? 0;
    replace(backup?.session ?? null); changeSource(backup?.source ?? '');
    setCurrentTime(pendingSeek.current); lastReliable.current = pendingSeek.current; setHasInput(false); setNotice('');
  }
  async function restoreDraft(value: AnnotationSessionV2): Promise<boolean> {
    if (submissionInFlight.current || audioOperation.current) return false;
    const request = requestSequence.current;
    setBusy(true); stop(); mediaRef.current?.pause();
    if (!await persist()) { setBusy(false); setError(t('Your current session could not be saved. It is still open here. Export a JSON backup before leaving this session.', '当前会话无法保存，内容仍保留在此页面。请先导出 JSON 备份，再离开此会话。')); return false; }
    // A draft list may predate edits or another tab's save. Restore the newest known revision.
    const current = sessionRef.current;
    let candidate = current?.id === value.id && current.revision > value.revision ? current : value;
    const stored = await loadSession(value.id).catch(() => undefined);
    if (!mounted.current || request !== requestSequence.current) return false;
    if (stored && stored.revision > candidate.revision) candidate = stored;
    const open = activePass(candidate);
    const next = open ? closePass(candidate, open.events.at(-1)?.mediaTime ?? open.start, 'interrupted') : candidate;
    let draftSource = research ? next.asset.url ?? `/api/study/${research.study.token}/audio/${next.asset.id}` : '';
    if (!research && next.mode === 'free' && next.asset.sha256) {
      const cached = [...preparedAudio.current.values()].find(item => item.asset.sha256 === next.asset.sha256 && (item.asset.id === next.asset.id || !item.asset.url && !next.asset.url));
      if (cached) draftSource = cached.source;
      else {
        const clip = library.clips.find(clip => `library-${clip.id}` === next.asset.id && clip.url === next.asset.url);
        if (clip) {
          try { const item = await prepareLibraryClip(clip); if (item.asset.sha256 === next.asset.sha256) draftSource = item.source; }
          catch { /* Keep the saved annotation available even when its audio is offline. */ }
        }
      }
    }
    if (!mounted.current || request !== requestSequence.current) return false;
    pendingSeek.current = 0; replace(next); changeSource(draftSource);
    setCurrentTime(0); lastReliable.current = 0; setTarget(next.emotionTarget === 'felt' ? 'felt' : 'perceived');
    setShowDrafts(false); setError(''); setHasInput(false); setSubmission('idle'); setSubmittedSnapshot(null); setBusy(false);
    setNotice(next.mode === 'legacy' || !next.asset.sha256 && !research ? t('Historical inputs are available for export. Their original audio cannot be verified; choosing an audio file starts a new session.', '历史输入可导出保留。原音频身份无法验证，选择音频将建立新会话。') : draftSource ? t('Draft restored.', '草稿已恢复。') : t('Draft restored. Select the original audio file to continue; its fingerprint will be checked.', '草稿已恢复。重新选择原音频后即可继续，系统会校验文件指纹。'));
    return true;
  }
  async function removeDraft(draft: AnnotationSessionV2) {
    if (submissionInFlight.current) return;
    if (!window.confirm(t('Delete this local draft? Export it first if you need a copy.', '删除此本地草稿？如需保留，请先导出。'))) return;
    try {
      if (draft.id === sessionRef.current?.id) { stop(); mediaRef.current?.pause(); replace(null); changeSource(''); }
      await deleteSession(draft.id); await refreshDrafts();
    } catch { setError(t('This draft could not be deleted. Please try again.', '无法删除此草稿，请重试。')); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (busy || audioOperation.current || submissionInFlight.current) { if (importRef.current) importRef.current.value = ''; return; }
    setBusy(true);
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error(t('Session files must be smaller than 100 MB.', '会话文件不能超过 100 MB。'));
      const parsed = importSession(await file.text());
      const imported = { ...parsed, id: crypto.randomUUID(), importedFromSessionId: parsed.id, updatedAt: new Date().toISOString() };
      if (imported.mode === 'research') throw new Error(t('Open the original research invitation to restore a research session.', '请通过原研究邀请链接恢复研究会话。'));
      if (!await restoreDraft(imported)) return;
      if (imported.mode !== 'legacy' && imported.asset.sha256) setNotice(t('Session imported. Reconnect the matching audio to continue.', '会话已导入，关联对应音频后可继续。'));
    } catch (error) { setError(`${t('This session could not be imported.', '无法导入此会话。')} ${errorText(error)}`); }
    finally { if (mounted.current) setBusy(false); if (importRef.current) importRef.current.value = ''; }
  }
  function exportFile(format: 'json' | 'csv') {
    const current = sessionRef.current; if (!current || activePass(current)) return;
    try {
      const stem = current.asset.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_') || 'mood-rater';
      download(format === 'json' ? sessionToJson(current) : sessionToCsv(current), `${stem}-annotations.${format}`, format === 'json' ? 'application/json' : 'text/csv;charset=utf-8');
    } catch (error) { setError(errorText(error)); }
  }
  async function submit() {
    if (!research || !sessionRef.current || activePass(sessionRef.current) || submissionInFlight.current) return;
    const snapshot = sessionRef.current;
    submissionInFlight.current = true;
    setSubmission('sending'); setSubmissionProgress(0); setError('');
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
      if (bytes.byteLength > 32 * 1024 * 1024) throw new Error(t('This session is too large to submit. Export it and contact the researcher.', '此会话过大，无法提交。请导出文件并联系研究者。'));
      const sha256 = await digest(bytes.buffer as ArrayBuffer);
      // Content-derived UUID guarantees identical retry identity after a reload.
      const id = `${sha256.slice(0, 8)}-${sha256.slice(8, 12)}-4${sha256.slice(13, 16)}-a${sha256.slice(17, 20)}-${sha256.slice(20, 32)}`;
      const init = await responseJson<{ status: 'pending' | 'ready'; chunkCount: number; chunkSize: number; uploadedParts: number[] }>(await fetch('/api/submissions/init', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participationToken: research.participationToken, submissionId: id, sessionId: snapshot.id, assetId: snapshot.asset.id, revision: snapshot.revision, size: bytes.byteLength, sha256 }) }));
      if (init.status !== 'ready') {
        for (let index = 0; index < init.chunkCount; index++) {
          if (!init.uploadedParts.includes(index)) await responseJson(await fetch(`/api/submissions/${id}/chunks/${index}`, { method: 'PUT', headers: { Authorization: `Bearer ${research.participationToken}`, 'Content-Type': 'application/octet-stream' }, body: bytes.slice(index * init.chunkSize, (index + 1) * init.chunkSize) }));
          setSubmissionProgress(Math.round((index + 1) / init.chunkCount * 95));
        }
        const complete = await responseJson<{ submission: { status: string } }>(await fetch(`/api/submissions/${id}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${research.participationToken}` } }));
        if (complete.submission?.status !== 'ready') throw new Error(t('Server confirmation is pending. Please retry.', '服务器尚未确认保存，请重试。'));
      }
      onSubmitted?.(snapshot.asset.id);
      if (sessionRef.current?.id === snapshot.id) { setSubmissionProgress(100); setSubmission('ready'); setSubmittedSnapshot({ sessionId: snapshot.id, revision: snapshot.revision }); }
    } catch (error) { if (sessionRef.current?.id === snapshot.id) { setSubmission('error'); setError(`${t('Submission was not confirmed. Keep this tab open and retry, or export a backup.', '提交尚未确认，请保留此页面重试，或导出备份。')} ${errorText(error)}`); } }
    finally { submissionInFlight.current = false; }
  }

  const locked = busy || submission === 'sending';
  const isSubmitted = submission === 'ready' && submittedSnapshot?.sessionId === session?.id && submittedSnapshot?.revision === session?.revision;
  const closedPasses = session?.passes.filter(pass => !pass.revoked && pass.end !== null).length ?? 0;
  const selectedTarget = session?.emotionTarget ?? target;
  const currentAudio = [...libraryClips, ...localClips].find(item => item.source === source && item.asset.sha256 === session?.asset.sha256);
  const axisLabel = (axis: 'x' | 'y', field: 'name' | 'low' | 'high') => activeProfile.config.axes[axis][field][locale];
  return <div className={styles.workspace}>
    <div className={styles.workspaceTop}>
      <div><p className="eyebrow">{research ? t('RESEARCH SESSION', '研究会话') : t('YOUR LISTENING SPACE', '你的聆听空间')}</p>
        <h1>{practice ? t('A little practice, first.', '先练习，找到感觉。') : t('Listen. Feel. Trace.', '聆听。感受。描绘。')}</h1>
        <p className={styles.subtitle}>{t('Follow how emotion changes, one moment at a time.', '跟随声音，记录每一刻的情绪变化。')}</p>
      </div>
      <div className={styles.topActions}>{practice ? <button className={styles.secondaryButton} onClick={finishPractice}><ArrowLeft size={16}/>{t('Finish practice', '结束练习')}</button> : <>
        <button className={styles.textButton} onClick={startPractice} disabled={locked}><AudioLines size={16}/>{t('Try a practice', '练习一下')}</button>
        <button className={styles.secondaryButton} onClick={() => { setShowDrafts(value => !value); void refreshDrafts(); }} disabled={locked}><FolderOpen size={16}/>{t('My drafts', '我的草稿')}{drafts.length > 0 && <span className={styles.count}>{drafts.length}</span>}</button>
      </>}</div>
    </div>

    <div className={styles.steps} aria-label={t('Annotation workflow', '标注流程')}>
      {[t('Load & listen', '载入与聆听'), t('Trace emotion', '描绘情绪'), t('Review & save', '回顾与保存')].map((label, index) => <span key={label} className={((!session && index === 0) || (session && !stats.eventCount && index === 1) || (stats.eventCount > 0 && index === 2)) ? styles.stepActive : ''}><span>{index + 1}</span>{label}</span>)}
    </div>
    {error && <div role="alert" className={styles.error}><Info size={17}/><span>{error}</span><button onClick={() => setError('')} aria-label={t('Dismiss error', '关闭错误提示')}>×</button></div>}
    {notice && <div role="status" className={styles.notice}><Info size={16}/><span>{notice}</span></div>}
    {practice && <div className={styles.practiceNotice}><AudioLines size={17}/><span>{t('Practice mode · A synthesized 20-second sound study, created for this demo. No recordings are submitted or added to your drafts.', '练习模式 · 此演示专用的 20 秒合成音频。练习不会提交，也不会加入你的草稿。')}</span></div>}

    {showDrafts && !practice && <section className={styles.drafts}>
      <div className={styles.sectionHeading}><h2>{t('Saved on this device', '保存在此设备上')}</h2><button className={styles.textButton} onClick={() => setShowDrafts(false)}>{t('Close', '关闭')}</button></div>
      <p>{t('Audio stays with you. Re-select the original local file when restoring a draft.', '音频保留在你手中。恢复本地草稿时，需要重新选择原音频。')}</p>
      {!drafts.length && <p>{t('Your first annotation will be saved here automatically.', '首次标注会自动保存在这里。')}</p>}
      {drafts.map(draft => <div className={styles.draftRow} key={draft.id}><div><strong>{draft.asset.name}</strong><span>{new Date(draft.updatedAt).toLocaleString(locale)} · {formatTime(draft.asset.duration)}</span></div><button className={styles.secondaryButton} disabled={locked} onClick={() => void restoreDraft(draft)}>{t('Restore', '恢复')}</button><button className={styles.iconButton} disabled={locked} aria-label={`${t('Delete draft', '删除草稿')} ${draft.asset.name}`} onClick={() => void removeDraft(draft)}><Trash2 size={16}/></button></div>)}
    </section>}

    <div className={styles.mainGrid}>
      <section className={styles.listenCard} aria-label={t('Audio and session settings', '音频与会话设置')}>
        <div className={styles.sectionHeading}><h2><span className={styles.sectionNumber}>01</span>{t('The audio', '聆听音频')}</h2><Volume2 size={19} strokeWidth={1.5}/></div>
        {research && !practice && <div className={styles.assetList}>{research.study.assets.map((asset, index) => <button key={asset.id} className={`${styles.assetButton} ${session?.asset.id === asset.id ? styles.assetSelected : ''}`} disabled={locked || recording} onClick={() => void selectAsset(asset)}><span>{String(index + 1).padStart(2, '0')}</span><span>{asset.name}<small>{formatTime(asset.duration)}</small></span>{session?.asset.id === asset.id && <Check size={16}/>}</button>)}</div>}
        {!research && !practice && <>
          <div className={styles.clipPicker}>
            <label className={styles.fieldLabel} htmlFor="audio-clip">{t('Choose an audio clip', '选择一段音频')}</label>
            <select id="audio-clip" value={currentAudio?.key ?? ''} disabled={locked} onChange={event => void selectClip(event.target.value)}>
              <option value="" disabled>{t('Select a sample or add local files', '选择示例，或添加本地文件')}</option>
              {library.clips.length > 0 && <optgroup label={t('Audio library', '音频库')}>{library.clips.map(clip => <option key={clip.id} value={`library:${clip.id}`}>{clip.title[locale]}{clip.demoOnly ? t(' · demo', ' · 演示') : ''}</option>)}</optgroup>}
              {localClips.length > 0 && <optgroup label={t('Your local files', '你的本地文件')}>{localClips.map(clip => <option key={clip.key} value={clip.key}>{clip.title[locale]}</option>)}</optgroup>}
            </select>
            <p className={styles.helper}>{t('Each clip keeps its own annotations. Switching stops and saves the current recording.', '每段音频分别保存标注。切换时会停止并保存当前标注。')}</p>
            {currentAudio?.demoOnly && <p className={styles.demoAudioNote}>{t('Synthesized demo audio · no ground-truth emotion ratings.', '合成演示音频 · 无标准情绪答案。')}</p>}
          </div>
          <input ref={localFileRef} type="file" multiple accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm" className={styles.hiddenInput} onChange={event => void loadLocal(Array.from(event.target.files ?? []))}/>
          <button className={`${styles.uploadZone} ${styles.uploadCompact}`} disabled={locked} onClick={() => localFileRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!locked) void loadLocal(Array.from(event.dataTransfer.files)); }}>
            <span className={styles.uploadIcon}>{busy ? <LoaderCircle className={styles.spinner}/> : <Upload size={22}/>}</span>
            <strong>{session && !source ? t('Reconnect original audio', '重新关联原音频') : t('Add your audio files', '添加你的音频文件')}</strong>
            <span>{t('Choose or drop multiple files · up to 20', '可多选或拖放文件 · 最多 20 个')}</span><small>{t('Each file: up to 30 min / 100 MB', '每个文件：最长 30 分钟 / 100 MB')}</small>
          </button>
        </>}
        {session && <div className={styles.audioIdentity}><span className={styles.audioFileIcon}><FileAudio size={22} strokeWidth={1.5}/></span><div><strong title={session.asset.name}>{practice ? t('Sound study', '声音练习') : currentAudio?.title[locale] ?? session.asset.name}</strong><span>{formatTime(duration)} · {practice ? t('SYNTHESIZED AUDIO', '合成音频') : t('ORIGINAL SPEED · 1×', '原速播放 · 1×')}</span></div></div>}
        <audio ref={mediaRef} src={source || undefined} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); stop('pause'); }}
          onLoadedMetadata={event => { if (pendingSeek.current > 0) { event.currentTarget.currentTime = Math.min(pendingSeek.current, event.currentTarget.duration); pendingSeek.current = 0; } }}
          onTimeUpdate={event => { setCurrentTime(event.currentTarget.currentTime); if (!activePass(sessionRef.current)) lastReliable.current = event.currentTarget.currentTime; }}
          onEnded={() => { stop('ended', sessionRef.current?.asset.duration); setPlaying(false); void persist(); }}
          onWaiting={() => { if (activePass(sessionRef.current)) { stop('buffering', lastReliable.current); mediaRef.current?.pause(); setNotice(t('Audio is buffering. Press Record when playback is ready.', '音频正在缓冲，播放就绪后请重新开始标注。')); } }}
          onSeeking={() => { if (activePass(sessionRef.current)) { stop('seek', lastReliable.current); mediaRef.current?.pause(); } }}
          onRateChange={event => { if (event.currentTarget.playbackRate !== 1) { stop('interrupted', lastReliable.current); event.currentTarget.pause(); event.currentTarget.playbackRate = 1; } }}
          onError={() => { stop('error', lastReliable.current); setPlaying(false); if (sourceRef.current) setError(t('This audio could not be loaded. Check the format or connection and try again.', '无法载入音频，请检查格式或网络连接后重试。')); }} />
        <div className={styles.playerControls}>
          <button className={styles.playButton} disabled={!source || locked} onClick={() => void togglePlayback()} aria-label={playing ? t('Pause audio', '暂停音频') : t('Listen without recording', '试听，不记录标注')}>{playing ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</button>
          <div className={styles.seekContainer}><input aria-label={t('Audio position', '音频播放位置')} type="range" min="0" max={duration || 1} step="0.01" value={Math.min(currentTime, duration || 1)} disabled={!source || locked} onChange={event => seek(Number(event.target.value))}/><div><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div></div>
        </div>
        <p className={styles.playerNote}>{t('Listening alone does not change your annotations.', '仅试听不会改变已有标注。')}</p>

        <div className={styles.divider}/>
        <label className={styles.fieldLabel} htmlFor="emotion-target">{t('What are you rating?', '你在标注什么？')}</label>
        <select id="emotion-target" value={selectedTarget === 'unknown' ? 'perceived' : selectedTarget} disabled={Boolean(session?.passes.length) || session?.mode === 'legacy' || Boolean(research) || locked} onChange={event => { const value = event.target.value as EmotionTarget; setTarget(value); const current = sessionRef.current; if (current && !current.passes.length) replace({ ...current, emotionTarget: value, revision: current.revision + 1, updatedAt: new Date().toISOString() }); }}>
          <option value="perceived">{t('Emotion expressed by the audio', '音频表达的情绪')}</option><option value="felt">{t('Emotion I feel while listening', '聆听时我自身的感受')}</option>
        </select>
        <p className={styles.helper}>{selectedTarget === 'unknown' ? t('Legacy session: the original annotation target is unknown.', '旧版会话：原始标注对象未知。') : t('Fixed for each session, so the meaning of your ratings stays consistent.', '每次会话固定标注对象，让评分含义始终一致。')}</p>

        <details className={styles.instructions}><summary>{t('A quick guide', '简明操作指南')}<Info size={15}/></summary><ol><li>{t('Listen to the audio and decide which emotion to rate.', '先试听音频，确认要标注的情绪。')}</li><li>{t('Press Record, then move the point as the emotion changes.', '点击「开始标注」，随情绪变化移动圆点。')}</li><li>{t('Your last rating holds until you move again. Before the first input, the trace is blank.', '松手后保持最近评分；首次操作前为空白。')}</li><li>{t('Pause, seek, then record again to replace a section. Undo restores the previous pass.', '暂停并定位，再次标注可替换该区间；撤销可恢复上一轮。')}</li></ol><p>{t('Keyboard: use arrow keys on the plane (Shift for larger steps), or use the two sliders below. Pointer inputs are captured up to 30 Hz; exports include a derived 10 Hz series.', '键盘：在平面上使用方向键（按住 Shift 可大步移动），或使用下方滑块。指针输入最高采集 30 Hz；导出包含派生的 10 Hz 序列。')}</p></details>
        <div className={styles.privacy}><ShieldCheck size={18}/><span>{research ? t('Your ratings upload only when you submit.', '只有点击提交，评分才会上传。') : t('Your audio and annotations stay on this device.', '你的音频和标注保留在此设备。')}</span></div>
      </section>

      <section className={styles.annotationCard} aria-label={t('Emotion annotation', '情绪标注')}>
        <div className={styles.sectionHeading}><h2><span className={styles.sectionNumber}>02</span>{t('The emotion', '描绘情绪')}</h2><span className={`${styles.statusBadge} ${recording ? styles.recordingBadge : ''}`}><span/>{recording ? t('Recording', '正在标注') : playing ? t('Listening', '正在试听') : t('Ready when you are', '准备好即可开始')}</span></div>
        <VAPlane profile={activeProfile} locale={locale} rating={rating} touched={touched} recording={recording} locked={locked} onChange={capture}/>
        <p className={styles.planeHint} id="plane-help">{recording ? (hasInput ? t('Move as emotion changes. Releasing holds your last rating.', '随情绪变化移动，松手后保持最近评分。') : t('Move the point to begin your trace. No rating has been recorded yet.', '移动圆点开始绘制轨迹。目前尚未记录评分。')) : t('Explore the plane, then press Record to save your movements.', '先熟悉平面，点击「开始标注」后才会记录移动。')}</p>
        {session && !session.interfaceProfile && <p className={styles.helper}>{t('This older session did not record its interface settings. The displayed guidance uses the current interface; the historical data stays unchanged.', '此旧会话未记录界面配置。当前参考提示使用现行界面，历史数据保持不变。')}</p>}
        <div className={styles.recordActions}><button className={`${styles.recordButton} ${recording ? styles.stopButton : ''}`} disabled={!source || locked} onClick={() => void toggleRecording()}>{recording ? <Square size={15} fill="currentColor"/> : <Circle size={15} fill="currentColor"/>}{recording ? t('Stop recording', '停止标注') : closedPasses ? t('Record from here', '从此处重新标注') : t('Start recording', '开始标注')}</button><button className={styles.undoButton} disabled={!closedPasses || recording || locked} onClick={() => { if (sessionRef.current) { replace(undoPass(sessionRef.current)); setNotice(t('Last recording undone. The previous trace is restored.', '已撤销最近一次标注，恢复此前的轨迹。')); } }}><RotateCcw size={16}/>{t('Undo', '撤销')}</button></div>
        <details className={styles.fineAdjustment}><summary>{t('Fine adjustment (optional)', '精细调整（可选）')}</summary><div className={styles.ratingSliders}>
          <label><span><i className={styles.valenceKey}/>{axisLabel('x', 'name')}<strong>{touched ? rating[0].toFixed(2) : '—'}</strong></span><input aria-label={`${axisLabel('x', 'name')}: ${axisLabel('x', 'low')}–${axisLabel('x', 'high')}`} type="range" min="0" max="1" step="0.01" value={rating[0]} disabled={locked} onChange={event => capture(Number(event.target.value), ratingRef.current[1], 'slider', true)}/></label>
          <label><span><i className={styles.arousalKey}/>{axisLabel('y', 'name')}<strong>{touched ? rating[1].toFixed(2) : '—'}</strong></span><input aria-label={`${axisLabel('y', 'name')}: ${axisLabel('y', 'low')}–${axisLabel('y', 'high')}`} type="range" min="0" max="1" step="0.01" value={rating[1]} disabled={locked} onChange={event => capture(ratingRef.current[0], Number(event.target.value), 'slider', true)}/></label>
        </div></details>
      </section>
    </div>

    <section className={styles.reviewCard} aria-label={t('Review and export', '回顾与导出')}>
      <div className={styles.sectionHeading}><h2><span className={styles.sectionNumber}>03</span>{t('Your emotion trace', '你的情绪轨迹')}</h2><div className={styles.legend}><span><i className={styles.valenceKey}/>{t('Valence', '愉悦度')}</span><span><i className={styles.arousalKey}/>{t('Arousal', '唤醒度')}</span><button className={styles.textButton} onClick={() => setShowTimeline(value => !value)}>{showTimeline ? t('Hide', '收起') : t('Show', '展开')}</button></div></div>
      {showTimeline && <AnnotationTimeline samples={samples} passes={preview?.passes ?? []} duration={duration} currentTime={currentTime} onSeek={seek} t={t}/>}
      <div className={styles.reviewMeta}><span><strong>{Math.round(stats.coverage * 100)}%</strong> {t('coverage', '有效覆盖')}</span><span><strong>{stats.eventCount.toLocaleString(locale)}</strong> {t('inputs', '次输入')}</span><span><strong>{stats.passCount}</strong> {t('passes', '轮标注')}</span><span className={styles.gapNote}>{t('Gaps are missing data. Shaded areas show recording passes.', '空白为缺失数据，底色表示标注区间。')}</span></div>
      <div className={styles.reviewBottom}>
        <label className={styles.notesLabel}>{t('Listening notes', '聆听笔记')}<span>{t('optional', '选填')}</span><textarea rows={2} maxLength={4000} disabled={!session || recording || locked} value={session?.notes ?? ''} placeholder={t('Anything you want to remember about this recording…', '记下与此次标注有关的观察……')} onChange={event => { const current = sessionRef.current; if (current) replace({ ...current, notes: event.target.value, revision: current.revision + 1, updatedAt: new Date().toISOString() }); }}/></label>
        <div className={styles.exportPanel}>
          <span className={`${styles.saveStatus} ${saveState === 'error' ? styles.saveError : ''}`} role="status">{practice ? <Info size={15}/> : saveState === 'saved' ? <CheckCircle2 size={15}/> : saveState === 'saving' ? <LoaderCircle size={15} className={styles.spinner}/> : <Info size={15}/>} {practice ? t('Practice is not saved', '练习不保存') : saveState === 'error' ? t('Local saving unavailable — export a copy', '本地保存不可用，请导出备份') : saveState === 'saving' ? t('Saving on this device…', '正在保存到此设备……') : session ? t('Saved on this device', '已保存到此设备') : t('Local autosave when you begin', '开始后自动本地保存')}</span>
          <div className={styles.exportButtons}><button className={styles.secondaryButton} disabled={!session || recording || practice} onClick={() => exportFile('json')}><ArrowDownToLine size={16}/>JSON</button><button className={styles.secondaryButton} disabled={!session || recording || practice} onClick={() => exportFile('csv')}><ArrowDownToLine size={16}/>CSV</button></div>
          {!research && !practice && <><input ref={importRef} className={styles.hiddenInput} type="file" accept=".json,application/json" onChange={event => void importFile(event.target.files?.[0])}/><button className={styles.textButton} disabled={recording || locked} onClick={() => importRef.current?.click()}>{t('Import a previous session', '导入已有会话')}</button></>}
        </div>
      </div>
      {research && !practice && <div className={styles.submitPanel}><div><strong>{isSubmitted ? t('Submission confirmed', '提交已确认') : t('Ready to share with the researcher?', '准备好提交给研究者了吗？')}</strong><p>{isSubmitted ? t('Your annotation is durably saved on the server. You can choose the next audio.', '标注已保存在服务器，你可以选择下一段音频。') : t('Partial annotations are welcome. Only your annotation data and anonymous participant code are sent.', '也可以提交部分标注。仅发送标注数据与匿名参与者编号。')}</p></div><button className={styles.recordButton} disabled={!session || recording || locked || isSubmitted} onClick={() => void submit()}>{submission === 'sending' ? <LoaderCircle size={17} className={styles.spinner}/> : isSubmitted ? <Check size={17}/> : <CloudUpload size={17}/>} {submission === 'sending' ? `${t('Submitting', '正在提交')} ${submissionProgress}%` : isSubmitted ? t('Submitted', '已提交') : submission === 'error' ? t('Retry submission', '重新提交') : t('Submit annotation', '提交标注')}</button></div>}
    </section>
    <p className={styles.researchNote}>{t('A research tool for continuous emotion annotation. Based on the work of Yang, Reed, Chew & Barthet.', '用于连续情绪标注的研究工具。基于 Yang、Reed、Chew 与 Barthet 的研究。')} <a href="/about">{t('Read the research & method', '了解研究与方法')} →</a></p>
  </div>;
}

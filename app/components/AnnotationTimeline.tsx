'use client';

import type { DerivedSample, RecordingPass } from '@/lib/types';
import styles from './Annotator.module.css';

export function formatTime(seconds: number) {
  const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
}

function curve(samples: DerivedSample[], key: 'valence' | 'arousal', duration: number) {
  let path = '', previousY: number | null = null;
  const step = Math.max(1, Math.ceil(samples.length / 1200));
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const value = sample[key];
    if (value === null) { previousY = null; continue; }
    const starts = previousY === null;
    const ends = index === samples.length - 1 || samples[index + 1]?.[key] === null;
    if (!starts && !ends && index % step) continue;
    const x = 36 + sample.mediaTime / Math.max(duration, .1) * 608;
    const y = 112 - value * 94;
    path += starts ? `M${x.toFixed(2)},${y.toFixed(2)}` : `H${x.toFixed(2)}V${y.toFixed(2)}`;
    previousY = y;
  }
  return path;
}

export default function AnnotationTimeline({ samples, passes, duration, currentTime, onSeek, t }: {
  samples: DerivedSample[]; passes: RecordingPass[]; duration: number; currentTime: number;
  onSeek: (value: number) => void; t: (en: string, zh: string) => string;
}) {
  const hasData = samples.some(sample => sample.valence !== null);
  return <div className={styles.timeline}>
    <svg viewBox="0 0 680 148" role="img" aria-label={t('Valence and arousal over audio time. Blank areas have no annotation.', '效价与唤醒度随音频时间的变化。空白表示缺失标注。')}>
      {[0, .5, 1].map(value => <g key={value}>
        <line x1="36" x2="644" y1={112 - value * 94} y2={112 - value * 94} stroke="#e5e8e2" />
        <text x="22" y={116 - value * 94} textAnchor="end" className={styles.graphLabel}>{value}</text>
      </g>)}
      {passes.filter(pass => !pass.revoked && pass.end !== null).map(pass => <rect key={pass.id}
        x={36 + pass.start / Math.max(duration, .1) * 608} y="18"
        width={Math.max(0, ((pass.end ?? pass.start) - pass.start) / Math.max(duration, .1) * 608)} height="94"
        fill="#315c46" fillOpacity={Math.min(.12, .025 + pass.order * .008)}><title>{t('Recording pass', '标注区间')} {pass.order + 1}: {formatTime(pass.start)}–{formatTime(pass.end ?? pass.start)}</title></rect>)}
      <path d={curve(samples, 'valence', duration)} stroke="#bc735d" strokeWidth="2" fill="none" />
      <path d={curve(samples, 'arousal', duration)} stroke="#5c7f96" strokeWidth="2" fill="none" />
      <line x1={36 + currentTime / Math.max(duration, .1) * 608} x2={36 + currentTime / Math.max(duration, .1) * 608} y1="12" y2="118" stroke="#315c46" strokeWidth="1.5" />
      {[0, .25, .5, .75, 1].map(ratio => <text key={ratio} x={36 + ratio * 608} y="137" textAnchor="middle" className={styles.graphLabel}>{formatTime(duration * ratio)}</text>)}
      {!hasData && <text x="340" y="70" textAnchor="middle" className={styles.graphEmpty}>{t('Your emotion trace will appear here', '你的情绪轨迹将在这里呈现')}</text>}
    </svg>
    <input className={styles.timelineSeek} aria-label={t('Seek in annotation timeline', '在标注时间线上定位')} type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} disabled={!duration} onChange={event => onSeek(Number(event.target.value))} />
  </div>;
}

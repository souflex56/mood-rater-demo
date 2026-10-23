'use client';

import { useEffect, useRef, useState } from 'react';
import type { DerivedSample, RecordingPass } from '@/lib/types';
import styles from './Annotator.module.css';

export function formatTime(seconds: number) {
  const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
}

function curve(samples: DerivedSample[], key: 'valence' | 'arousal', duration: number, plotWidth: number) {
  let path = '', previousY: number | null = null;
  const step = Math.max(1, Math.ceil(samples.length / 1200));
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const value = sample[key];
    if (value === null) { previousY = null; continue; }
    const starts = previousY === null;
    const ends = index === samples.length - 1 || samples[index + 1]?.[key] === null;
    if (!starts && !ends && index % step) continue;
    const x = 36 + sample.mediaTime / Math.max(duration, .1) * plotWidth;
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
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(680);
  const plotWidth = Math.max(1, width - 72);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const hasData = samples.some(sample => sample.valence !== null);
  return <div ref={container} className={styles.timeline}>
    <svg viewBox={`0 0 ${width} 148`} role="img" aria-label={t('Valence and arousal over audio time. Blank areas have no annotation.', '愉悦度与唤醒度随音频时间的变化。空白表示缺失标注。')}>
      {[0, .5, 1].map(value => <g key={value}>
        <line x1="36" x2={width - 36} y1={112 - value * 94} y2={112 - value * 94} stroke="#e5e8e2" strokeWidth="1" />
        <text x="22" y={116 - value * 94} textAnchor="end" className={styles.graphLabel}>{value}</text>
      </g>)}
      {passes.filter(pass => !pass.revoked && pass.end !== null).map(pass => <rect key={pass.id}
        x={36 + pass.start / Math.max(duration, .1) * plotWidth} y="18"
        width={Math.max(0, ((pass.end ?? pass.start) - pass.start) / Math.max(duration, .1) * plotWidth)} height="94"
        fill="#315c46" fillOpacity={Math.min(.12, .025 + pass.order * .008)}><title>{t('Recording pass', '标注区间')} {pass.order + 1}: {formatTime(pass.start)}–{formatTime(pass.end ?? pass.start)}</title></rect>)}
      <path d={curve(samples, 'valence', duration, plotWidth)} stroke="#bc735d" strokeWidth="2" fill="none" />
      <path d={curve(samples, 'arousal', duration, plotWidth)} stroke="#5c7f96" strokeWidth="2" fill="none" />
      <line x1={36 + currentTime / Math.max(duration, .1) * plotWidth} x2={36 + currentTime / Math.max(duration, .1) * plotWidth} y1="12" y2="118" stroke="#315c46" strokeWidth="1.5" />
      {(width < 450 ? [0, .5, 1] : [0, .25, .5, .75, 1]).map(ratio => <text key={ratio} x={36 + ratio * plotWidth} y="137" textAnchor="middle" className={styles.graphLabel}>{formatTime(duration * ratio)}</text>)}
      {!hasData && <text x={width / 2} y="70" textAnchor="middle" className={styles.graphEmpty}>{t('No annotations yet', '尚无标注')}</text>}
    </svg>
    <input className={styles.timelineSeek} aria-label={t('Seek in annotation timeline', '在标注时间线上定位')} type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} disabled={!duration} onChange={event => onSeek(Number(event.target.value))} />
  </div>;
}

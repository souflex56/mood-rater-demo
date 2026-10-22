'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { backgroundColorAt, findNearbyTags, type EmotionTag, type LocalizedLabel, type VAInterfaceProfile } from '@/lib/va-config';
import type { Locale, RatingEvent } from '@/lib/types';
import styles from './VAPlane.module.css';

type Props = {
  profile: VAInterfaceProfile;
  locale: Locale;
  rating: [number, number];
  touched: boolean;
  recording: boolean;
  locked: boolean;
  onChange: (valence: number, arousal: number, input: RatingEvent['input'], force?: boolean) => void;
};

export default function VAPlane({ profile, locale, rating, touched, recording, locked, onChange }: Props) {
  const plane = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointerId = useRef<number | null>(null);
  const [width, setWidth] = useState(400);
  const helpId = useId();
  const label = (value: LocalizedLabel) => value[locale];
  const tagLabel = (tag: EmotionTag) => locale === 'zh-CN' && tag.label.en !== tag.label['zh-CN'] ? `${tag.label.en} · ${tag.label['zh-CN']}` : tag.label.en;
  const t = (en: string, zh: string) => locale === 'zh-CN' ? zh : en;
  const { axes, background, guide } = profile.config;
  const tags = useMemo(() => touched ? findNearbyTags(rating[0], rating[1], profile) : [], [touched, rating, profile]);

  useEffect(() => {
    const element = plane.current, surface = canvas.current;
    if (!element || !surface) return;
    const observer = new ResizeObserver(() => {
      const side = element.getBoundingClientRect().width;
      if (side <= 0) return;
      setWidth(side);
      const pixels = Math.max(2, Math.min(1536, Math.round(side * window.devicePixelRatio)));
      surface.width = pixels; surface.height = pixels;
      const context = surface.getContext('2d', { alpha: false });
      if (!context) return;
      const image = context.createImageData(pixels, pixels);
      for (let y = 0; y < pixels; y++) {
        for (let x = 0; x < pixels; x++) {
          const color = backgroundColorAt(x / (pixels - 1), 1 - y / (pixels - 1), background);
          const offset = (y * pixels + x) * 4;
          image.data[offset] = color[0]; image.data[offset + 1] = color[1]; image.data[offset + 2] = color[2]; image.data[offset + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [background]);

  function point(clientX: number, clientY: number, force = false) {
    if (locked) return;
    const rect = plane.current?.getBoundingClientRect();
    if (rect) onChange((clientX - rect.left) / rect.width, 1 - (clientY - rect.top) / rect.height, 'pointer', force);
  }

  const right = rating[0] <= .5;
  const chipWidth = Math.min(190, width * .43);
  const chipHeight = 24;
  const chipSpacing = 29;
  const firstTop = Math.max(8, Math.min(width - tags.length * chipSpacing - 4, (1 - rating[1]) * width - (tags.length - 1) * chipSpacing / 2 - chipHeight / 2));
  const chipLeft = right
    ? Math.min(width - chipWidth - 8, rating[0] * width + guide.diameterRatio * width / 2 + 15)
    : Math.max(8, rating[0] * width - guide.diameterRatio * width / 2 - 15 - chipWidth);

  return <div className={styles.container}>
    <div className={styles.endpointTop}><span>{label(axes.y.high)}</span><small>1</small></div>
    <div className={styles.planeRow}>
      <div className={styles.endpointLeft}><span>{label(axes.x.low)}</span><small>0</small></div>
      <div ref={plane} className={`${styles.square} ${recording ? styles.recording : ''}`} role="group" tabIndex={locked ? -1 : 0} aria-disabled={locked} aria-describedby={helpId}
        aria-label={`${t('Emotion plane', '情绪平面')}. X: ${label(axes.x.name)} (${label(axes.x.low)}–${label(axes.x.high)}). Y: ${label(axes.y.name)} (${label(axes.y.low)}–${label(axes.y.high)}). ${t('Use arrow keys to move.', '可使用方向键移动。')}`}
        onPointerDown={event => {
          if (locked || event.button !== 0 || pointerId.current !== null) return;
          event.currentTarget.focus(); pointerId.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId); point(event.clientX, event.clientY, true);
        }}
        onPointerMove={event => { if (pointerId.current === event.pointerId) point(event.clientX, event.clientY); }}
        onPointerUp={event => {
          if (pointerId.current !== event.pointerId) return;
          point(event.clientX, event.clientY, true); pointerId.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { pointerId.current = null; }}
        onLostPointerCapture={() => { pointerId.current = null; }}
        onKeyDown={event => {
          if (locked || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? .1 : .02;
          onChange(rating[0] + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), rating[1] + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0), 'keyboard', true);
        }}>
        <canvas ref={canvas} className={styles.background} aria-hidden="true"/>
        <div className={styles.horizontalAxis}/><div className={styles.verticalAxis}/>
        <span className={styles.xAxisName}>X · {label(axes.x.name)}</span><span className={styles.yAxisName}>Y · {label(axes.y.name)}</span>
        {touched && <>
          <div className={styles.guideCircle} data-guide-diameter={guide.diameterRatio} aria-hidden="true" style={{ left: `${rating[0] * 100}%`, top: `${(1 - rating[1]) * 100}%`, width: `${guide.diameterRatio * 100}%`, height: `${guide.diameterRatio * 100}%` }}/>
          <svg className={styles.leaders} viewBox={`0 0 ${width} ${width}`} aria-hidden="true">
            {tags.map((tag, index) => <g key={tag.id} data-tag-id={tag.id} data-valence={tag.valence} data-arousal={tag.arousal}>
              <line x1={tag.valence * width} y1={(1 - tag.arousal) * width} x2={right ? chipLeft : chipLeft + chipWidth} y2={firstTop + index * chipSpacing + chipHeight / 2} stroke="white" strokeWidth="1.2" strokeOpacity=".9"/>
              <circle cx={tag.valence * width} cy={(1 - tag.arousal) * width} r="3" fill="#26382e" stroke="white" strokeWidth="1.5"/>
            </g>)}
          </svg>
          {tags.map((tag, index) => <span key={tag.id} className={styles.tagCallout} data-guidance-tag={tag.id} title={`${tagLabel(tag)} · ${tag.valence.toFixed(2)}, ${tag.arousal.toFixed(2)}`} style={{ left: chipLeft, top: firstTop + index * chipSpacing, width: chipWidth }}><b>{index + 1}</b><span>{tagLabel(tag)}</span></span>)}
          <span className={styles.currentPoint} style={{ left: `${rating[0] * 100}%`, top: `${(1 - rating[1]) * 100}%` }} aria-hidden="true"/>
        </>}
      </div>
      <div className={styles.endpointRight}><span>{label(axes.x.high)}</span><small>1</small></div>
    </div>
    <div className={styles.endpointBottom}><span>{label(axes.y.low)}</span><small>0</small></div>
    <div className={styles.guideFeedback} id={helpId}>
      {tags.length ? <>
        <p>{t('Words in your circle · nearest first', '圆内参考词 · 按距离从近到远')}</p>
        <ol aria-label={t('Nearby emotion words', '附近的情绪参考词')}>{tags.map(tag => <li key={tag.id}>{tagLabel(tag)}</li>)}</ol>
      </> : <p>{touched ? t('No reference words in this circle.', '当前圆内没有情绪参考词。') : t('Click or tap the plane to explore nearby emotion words.', '点击平面，查看附近的情绪参考词。')}</p>}
      <small>{t(`Circle diameter: ${guide.diameterRatio * 100}% of the plane · up to ${guide.maxTags} words inside the circle.`, `圆直径为平面宽度的 ${guide.diameterRatio * 100}% · 仅显示圆内最多 ${guide.maxTags} 个词。`)}</small>
    </div>
  </div>;
}

'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
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
  const helpId = useId();
  const label = (value: LocalizedLabel) => value[locale];
  const tagLabel = (tag: EmotionTag) => locale === 'zh-CN' && tag.label.en !== tag.label['zh-CN'] ? `${tag.label.en} · ${tag.label['zh-CN']}` : tag.label.en;
  const t = (en: string, zh: string) => locale === 'zh-CN' ? zh : en;
  const { axes, background, guide } = profile.config;
  const tags = useMemo(() => touched ? findNearbyTags(rating[0], rating[1], profile) : [], [touched, rating, profile]);

  useEffect(() => {
    const element = plane.current, surface = canvas.current;
    if (!element || !surface) return;
    let renderedPixels = 0;
    const observer = new ResizeObserver(() => {
      const side = element.getBoundingClientRect().width;
      if (side <= 0) return;
      const pixels = Math.max(2, Math.min(1536, Math.round(side * window.devicePixelRatio)));
      if (pixels === renderedPixels) return;
      renderedPixels = pixels;
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

  return <div className={styles.container}>
    <div className={styles.planeRow}>
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
        <span className={`${styles.quadrantLabel} ${styles.topLeft}`} data-quadrant="top-left">{label(axes.x.low)} · {label(axes.y.high)}</span>
        <span className={`${styles.quadrantLabel} ${styles.topRight}`} data-quadrant="top-right">{label(axes.x.high)} · {label(axes.y.high)}</span>
        <span className={`${styles.quadrantLabel} ${styles.bottomLeft}`} data-quadrant="bottom-left">{label(axes.x.low)} · {label(axes.y.low)}</span>
        <span className={`${styles.quadrantLabel} ${styles.bottomRight}`} data-quadrant="bottom-right">{label(axes.x.high)} · {label(axes.y.low)}</span>
        <span className={`${styles.axisName} ${styles.yAxisName}`} data-axis="y" title={label(axes.y.name)}><span aria-hidden="true">↑</span><span>{label(axes.y.name)}</span></span>
        <span className={`${styles.axisName} ${styles.xAxisName}`} data-axis="x" title={label(axes.x.name)}><span>{label(axes.x.name)}</span><span aria-hidden="true">→</span></span>
        {touched && <>
          <div className={styles.guideCircle} data-guide-diameter={guide.diameterRatio} aria-hidden="true" style={{ left: `${rating[0] * 100}%`, top: `${(1 - rating[1]) * 100}%`, width: `${guide.diameterRatio * 100}%`, height: `${guide.diameterRatio * 100}%` }}/>
          <span className={styles.currentPoint} style={{ left: `${rating[0] * 100}%`, top: `${(1 - rating[1]) * 100}%` }} aria-hidden="true"/>
        </>}
      </div>
    </div>
    <div className={styles.guideFeedback} id={helpId}>
      {tags.length ? <ul role="list" aria-label={t('Reference words inside the circle, nearest first', '圆内情绪参考词，按距离从近到远')}>{tags.map((tag, index) => <li key={tag.id} data-guidance-tag={tag.id}>{tagLabel(tag)}{index < tags.length - 1 ? (locale === 'zh-CN' ? '，' : ',') : ''}</li>)}</ul>
        : <p>{touched ? t('No reference words within this circle.', '当前圆内没有情绪参考词。') : t('Select a point to view reference words.', '选择一个点，查看情绪参考词。')}</p>}
    </div>
  </div>;
}

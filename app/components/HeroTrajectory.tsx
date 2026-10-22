'use client';

import { useId, useState, type CSSProperties } from 'react';
import { AudioLines, Pause, Play } from 'lucide-react';
import { defaultVAInterface } from '@/lib/va-config';
import { useLanguage } from './LanguageProvider';
import { buildHeroTrajectory, HERO_DURATION_SECONDS, HERO_FADE_END_SECONDS, HERO_FADE_IN_SECONDS, HERO_FADE_START_SECONDS, HERO_WAYPOINT_HOLD_SECONDS } from './hero-trajectory-data';
import styles from './HeroTrajectory.module.css';

const trajectory = buildHeroTrajectory(defaultVAInterface.tags);
const percent = (seconds: number) => Number((seconds / HERO_DURATION_SECONDS * 100).toFixed(6));
const rounded = (value: number) => Number(value.toFixed(8));

/** The line and moving point share arc-distance keyframes, including a short hold at each tag. */
function animationRules(prefix: string) {
  const stops = trajectory.waypoints.flatMap(point => [
    { time: point.arrivalSeconds, progress: point.progress },
    { time: point.arrivalSeconds + HERO_WAYPOINT_HOLD_SECONDS, progress: point.progress },
  ]);
  stops.push({ time: HERO_FADE_START_SECONDS, progress: 1 }, { time: HERO_FADE_END_SECONDS, progress: 1 }, { time: HERO_DURATION_SECONDS, progress: 0 });
  const line = stops.map(stop => `${percent(stop.time)}%{stroke-dashoffset:${rounded(1 - stop.progress)}}`).join('');
  const point = stops.map(stop => `${percent(stop.time)}%{offset-distance:${rounded(stop.progress * 100)}%}`).join('');
  const labels = trajectory.waypoints.map((waypoint, index) => {
    const next = trajectory.waypoints[index + 1];
    const out = next ? `${percent(next.arrivalSeconds - .35)}%{opacity:1;transform:translateY(0)}${percent(next.arrivalSeconds - .05)}%,100%{opacity:0;transform:translateY(-3px)}` : '100%{opacity:1;transform:translateY(0)}';
    const attachment = waypoint.labelFrames.map(frame => `${percent(frame.time)}%{transform:translate(${rounded(frame.x)}px,${rounded(frame.y)}px)}`).join('');
    return `@keyframes ${prefix}-attachment-${index}{${attachment}}@keyframes ${prefix}-word-${index}{0%,${percent(waypoint.arrivalSeconds)}%{opacity:0;transform:translateY(4px)}${percent(waypoint.arrivalSeconds + .16)}%{opacity:1;transform:translateY(0)}${out}}`;
  }).join('');
  const fade = `0%{opacity:0}${percent(HERO_FADE_IN_SECONDS)}%,${percent(HERO_FADE_START_SECONDS)}%{opacity:1}${percent(HERO_FADE_END_SECONDS)}%,100%{opacity:0}`;
  return `@keyframes ${prefix}-line{${line}}@keyframes ${prefix}-point{${point}}@keyframes ${prefix}-trail{${fade}}${labels}`;
}

function fitLabel(value: string, width: number) {
  const measure = (character: string) => /\s/.test(character) ? 3 : character === '·' ? 4.5 : character.codePointAt(0)! > 0x2e80 ? 12 : /[A-Z]/.test(character) ? 8 : 6.6;
  const characters = [...value];
  const budget = width - 31;
  if (characters.reduce((sum, character) => sum + measure(character), 0) <= budget) return value;
  let visible = '', used = 0;
  for (const character of characters) {
    if (used + measure(character) > budget - 12) break;
    visible += character; used += measure(character);
  }
  return `${visible.trimEnd()}…`;
}

export default function HeroTrajectory() {
  const { locale, t } = useLanguage();
  const [paused, setPaused] = useState(false);
  const uniqueId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = `hero-trace-${uniqueId}`;
  const descriptionId = `hero-description-${uniqueId}`;
  const animationPrefix = `hero-motion-${uniqueId}`;
  const motionStyle = { '--trajectory-path': `path('${trajectory.path}')`, '--motion-duration': `${HERO_DURATION_SECONDS}s` } as CSSProperties;
  const start = trajectory.waypoints[0], end = trajectory.waypoints.at(-1)!;

  return <div className={`hero-art ${styles.art}`} data-motion-paused={paused} style={motionStyle}
    aria-label={t('Illustration of a valence–arousal trajectory', '愉悦度—唤醒度情绪轨迹示意')}>
    <div className="art-top"><span><span className="status-dot"/>{t('AN EMOTIONAL LANDSCAPE', '一段情绪的旅程')}</span><AudioLines size={18}/></div>
    <div className="illustration-plane">
      <span className="plane-axis-top">{t('ENERGETIC', '兴奋 ↑')}</span>
      <span className="plane-axis-bottom">{t('CALM', '↓ 平静')}</span>
      <span className={`plane-axis-left ${locale === 'zh-CN' ? styles.uprightAxis : ''}`}>{t('NEGATIVE', '消极')}</span>
      <span className={`plane-axis-right ${locale === 'zh-CN' ? styles.uprightAxis : ''}`}>{t('POSITIVE', '积极')}</span>
      <svg viewBox="0 0 360 300" role="img" aria-label={t('Example trajectory, not collected data', '轨迹示意，并非实际采集数据')} aria-describedby={descriptionId}>
        <desc id={descriptionId}>{t('An illustrative journey through neutral, sorrow, peaceful, tender, cheerful, enthusiastic, aggressive and anger, following their configured valence and arousal coordinates. This is an animation, not live ratings or a recording.', '轨迹依次经过中性、哀伤、平和、温柔、欢快、热烈、激昂、暴怒，位置来自对应词的愉悦度和唤醒度坐标。这是示意动画，不是实时评分或录音数据。')}</desc>
        <style>{animationRules(animationPrefix)}</style>
        <defs><linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#c8a17b"/><stop offset="100%" stopColor="#24594e"/></linearGradient></defs>
        <g stroke="#cbd5cd" strokeWidth="1" strokeDasharray="3 5"><path d="M180 15V285M25 150H335"/></g>
        <g stroke="#dce2d9" fill="none"><circle cx="180" cy="150" r="60"/><circle cx="180" cy="150" r="112"/></g>
        <g className={styles.trail} style={{ animationName: `${animationPrefix}-trail` }} data-hero-trail="true">
        <path d={trajectory.path} className={styles.drawnTrace} style={{ animationName: `${animationPrefix}-line` }} pathLength={1} stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none"/>
        <path d={trajectory.path} className={styles.drawnTrace} style={{ animationName: `${animationPrefix}-line` }} data-hero-trace="true" pathLength={1} stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" fill="none"/>
        <circle cx={start.x} cy={start.y} r="5" fill="#b39370"/>
        <g className={styles.staticPoint} aria-hidden="true"><circle cx={end.x} cy={end.y} r="15" fill="#24594e" fillOpacity=".12"/><circle cx={end.x} cy={end.y} r="6" fill="#24594e" stroke="white" strokeWidth="3"/></g>
        <g className={styles.traveller} style={{ animationName: `${animationPrefix}-point` }} data-hero-traveller="true" aria-hidden="true">
          <g className={styles.movingPoint} data-hero-marker="true">
          <circle r="15" fill="#24594e" fillOpacity=".12"/>
          <circle r="6" fill="#24594e" stroke="white" strokeWidth="3"/>
          </g>
        {trajectory.waypoints.map(({ tag, x, y, labelX, labelY, labelWidth, staticLabelX, staticLabelY, progress, arrivalSeconds, fromConfig }, index) => {
          const wordLabel = locale === 'zh-CN' ? `${tag.label.en} · ${tag.label['zh-CN']}` : tag.label.en;
          const labelStyle = { '--static-label-x': `${staticLabelX}px`, '--static-label-y': `${staticLabelY}px`, animationName: `${animationPrefix}-attachment-${index}` } as CSSProperties;
          return <g key={tag.id} className={styles.wordPlacement} transform={`translate(${labelX} ${labelY})`} style={labelStyle} aria-hidden="true"
            data-hero-waypoint={tag.id} data-valence={tag.valence} data-arousal={tag.arousal} data-point-x={x} data-point-y={y}
            data-arc-progress={progress} data-arrival-seconds={arrivalSeconds} data-configured-tag={fromConfig}>
          <g className={styles.word} data-hero-emotion={tag.id} style={{ animationName: `${animationPrefix}-word-${index}` }}>
            <title>{wordLabel}</title>
            <rect width={labelWidth} height="27" rx="8" fill="#fffefa" stroke="#d8e2d4"/>
            <circle cx="11" cy="13.5" r="2.5" fill="#8ca18b"/>
            <text x="21" y="17.2">{fitLabel(wordLabel, labelWidth)}</text>
          </g>
        </g>;})}
        </g>
        </g>
      </svg>
    </div>
    <div className={`art-bottom ${styles.bottom}`}>
      <span>{t('Valence × Arousal', '愉悦度 × 唤醒度')}</span>
      <span className={styles.caption} data-hero-note="true">{t('A feeling in motion', '感受正在变化')}</span>
      <button type="button" className={styles.motionButton} onClick={() => setPaused(value => !value)} aria-pressed={paused}
        aria-label={t(paused ? 'Resume illustration animation' : 'Pause illustration animation', paused ? '继续示意动画' : '暂停示意动画')}>
        {paused ? <Play size={12}/> : <Pause size={12}/>}<span>{t(paused ? 'Resume' : 'Pause', paused ? '继续' : '暂停')}</span>
      </button>
      <span className={styles.reducedLabel}>{t('Motion reduced', '已减少动态效果')}</span>
    </div>
  </div>;
}

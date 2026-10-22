'use client';

import { useId, useState, type CSSProperties } from 'react';
import { AudioLines, MoveUpRight, Pause, Play } from 'lucide-react';
import { defaultVAInterface } from '@/lib/va-config';
import { useLanguage } from './LanguageProvider';
import styles from './HeroTrajectory.module.css';

// The original homepage illustration path, shared by the drawn line and travelling point.
const TRAJECTORY = 'M82 224C126 237 159 201 137 178S86 155 122 132S181 183 215 154S230 115 249 104S302 105 279 67';
const WORDS = [
  { id: 'calm', x: 42, y: 245, width: 94 },
  { id: 'tender', x: 153, y: 211, width: 108 },
  { id: 'thoughtful', x: 28, y: 92, width: 140 },
  { id: 'hopeful', x: 179, y: 170, width: 128 },
  { id: 'bright', x: 220, y: 121, width: 116 },
  { id: 'care', x: 55, y: 33, width: 102 },
].flatMap((word, index) => {
  const tag = defaultVAInterface.tags.find(tag => tag.id === word.id) ?? defaultVAInterface.tags[index];
  return tag ? [{ ...word, tag }] : [];
});

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
  const uniqueId = useId().replaceAll(':', '');
  const gradientId = `hero-trace-${uniqueId}`;
  const descriptionId = `hero-description-${uniqueId}`;
  const motionStyle = { '--trajectory-path': `path('${TRAJECTORY}')` } as CSSProperties;

  return <div className={`hero-art ${styles.art}`} data-motion-paused={paused} style={motionStyle}
    aria-label={t('Illustration of a valence–arousal trajectory', '效价—唤醒情绪轨迹示意')}>
    <div className="art-top"><span><span className="status-dot"/>{t('AN EMOTIONAL LANDSCAPE', '一段情绪的旅程')}</span><AudioLines size={18}/></div>
    <div className="illustration-plane">
      <span className="plane-axis-top">{t('ENERGETIC', '高唤醒')}</span>
      <span className="plane-axis-bottom">{t('CALM', '低唤醒')}</span>
      <span className="plane-axis-left">{t('NEGATIVE', '负向')}</span>
      <span className="plane-axis-right">{t('POSITIVE', '正向')}</span>
      <svg viewBox="0 0 360 300" role="img" aria-label={t('Example trajectory, not collected data', '轨迹示意，并非实际采集数据')} aria-describedby={descriptionId}>
        <desc id={descriptionId}>{t('An illustrative emotional journey with reference words from the supplied tag list. The line and words are an animation, not live ratings or a recording.', '示意性的情绪旅程，参考词来自所给词表。轨迹和词语属于动画，不是实时评分或录音数据。')}</desc>
        <defs><linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#c8a17b"/><stop offset="100%" stopColor="#24594e"/></linearGradient></defs>
        <g stroke="#cbd5cd" strokeWidth="1" strokeDasharray="3 5"><path d="M180 15V285M25 150H335"/></g>
        <g stroke="#dce2d9" fill="none"><circle cx="180" cy="150" r="60"/><circle cx="180" cy="150" r="112"/></g>
        <path d={TRAJECTORY} stroke="#fff" strokeWidth="9" fill="none"/>
        <path d={TRAJECTORY} stroke="#bdcdbb" strokeWidth="1.5" fill="none" opacity=".45"/>
        <path d={TRAJECTORY} className={styles.drawnTrace} pathLength={1} stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" fill="none"/>
        <circle cx="82" cy="224" r="5" fill="#b39370"/>
        <g className={styles.staticPoint} aria-hidden="true"><circle cx="279" cy="67" r="15" fill="#24594e" fillOpacity=".12"/><circle cx="279" cy="67" r="6" fill="#24594e" stroke="white" strokeWidth="3"/></g>
        <g className={styles.traveller} data-hero-traveller="true" aria-hidden="true">
          <circle r="15" fill="#24594e" fillOpacity=".12"/>
          <circle r="6" fill="#24594e" stroke="white" strokeWidth="3"/>
        </g>
        {WORDS.map(({ id, x, y, width, tag }, index) => {
          const wordLabel = locale === 'zh-CN' ? `${tag.label.en} · ${tag.label['zh-CN']}` : tag.label.en;
          return <g key={id} transform={`translate(${x} ${y})`} aria-hidden="true">
          <g className={styles.word} data-hero-emotion={tag.id} style={{ animationDelay: `${index * 3.3}s` }}>
            <title>{wordLabel}</title>
            <rect width={width} height="27" rx="8" fill="#fffefa" stroke="#d8e2d4"/>
            <circle cx="11" cy="13.5" r="2.5" fill="#8ca18b"/>
            <text x="21" y="17.2">{fitLabel(wordLabel, width)}</text>
          </g>
        </g>;})}
      </svg>
      <span className={`trajectory-note ${styles.note}`}>{t('A feeling in motion', '感受正在变化')}<MoveUpRight size={14}/></span>
    </div>
    <div className={`art-bottom ${styles.bottom}`}>
      <span>{t('Valence × Arousal', '效价 × 唤醒')}</span>
      <span className={styles.caption}>{t('Illustrative trajectory', '示意轨迹')}</span>
      <button type="button" className={styles.motionButton} onClick={() => setPaused(value => !value)} aria-pressed={paused}
        aria-label={t(paused ? 'Resume illustration animation' : 'Pause illustration animation', paused ? '继续示意动画' : '暂停示意动画')}>
        {paused ? <Play size={12}/> : <Pause size={12}/>}<span>{t(paused ? 'Resume' : 'Pause', paused ? '继续' : '暂停')}</span>
      </button>
      <span className={styles.reducedLabel}>{t('Motion reduced', '已减少动态效果')}</span>
    </div>
  </div>;
}

'use client';
import { sitePath } from '@/lib/paths';

import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from './components/LanguageProvider';
import HeroTrajectory from './components/HeroTrajectory';

export default function Home() {
  const { t } = useLanguage();
  return <div className="home-page">
    <section className="hero">
      <div className="hero-copy">
        <h1>{t('Trace emotion', '记录音频中的')}<br/><em>{t('through sound.', '情绪变化')}</em></h1>
        <p className="hero-description">{t('Listen and click on the emotion map to record changes over time.', '边听边在坐标图中点击，记录情绪随时间的变化。')}</p>
        <div className="hero-actions">
          <a href={sitePath("/annotate")} className="button primary">{t('Start annotating', '开始标注')}<ArrowRight size={18}/></a>
          <a href="https://github.com/souflex56/mood-rater-demo" className="inline-link" target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={14}/></a>
        </div>
        <div className="hero-assurance"><ShieldCheck size={15}/><span>{t('No account needed. Local audio stays on your device; annotations stay in this browser.', '无需注册。本地音频不会上传，标注保存在当前浏览器。')}</span></div>
      </div>
      <HeroTrajectory/>
    </section>
    <section className="paths-section" aria-label={t('Configuration and research', '配置与研究')}>
      <div className="path-grid">
        <a className="path-card" href={sitePath("/customize")}>
          <h2>{t('Customize your study', '自定义配置')}</h2>
          <p>{t('Configure audio, emotion words, colors and axis labels for your own deployment.', '调整音频、情绪参考词、配色与坐标轴标签，部署适合自己项目的版本。')}</p>
          <span className="path-link">{t('View configuration guide', '查看配置指南')}<ArrowRight size={16}/></span>
        </a>
        <article className="path-card research-card">
          <h2>{t('Research background', '研究背景')}</h2>
          <p>{t('Based on ', '源于 ')}<a className="text-link" href="https://ieeexplore.ieee.org/document/9468946" target="_blank" rel="noreferrer">{t('Simin Yang’s research on changing emotion perception in music', 'Simin Yang 关于音乐时变情绪感知的研究')}</a>{t(', extended here to continuous annotation of general audio.', '，本版扩展至通用音频的连续标注。')}</p>
          <a className="path-link" href={sitePath("/about")}>{t('Read the research and citation', '了解研究与引用')}<ArrowRight size={16}/></a>
        </article>
      </div>
    </section>
  </div>;
}

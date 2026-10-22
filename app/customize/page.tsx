'use client';

import { ArrowRight, ArrowUpRight, AudioLines, BookOpen, Palette, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../components/LanguageProvider';

const source = 'https://github.com/souflex56/mood-rater-demo/blob/codex/mood-rater-v2/';

export default function CustomizePage() {
  const { t } = useLanguage();
  const items = [
    { icon: AudioLines, title: t('Your audio collection', '你的音频集合'), text: t('Use the bundled examples, load local audio, or configure the collection shown in your own deployment.', '体验内置示例、载入本地音频，或为自己的部署设置音频集合。'), file: 'config/audio-library.json', label: t('Audio library configuration', '音频集合配置') },
    { icon: BookOpen, title: t('Your guide words', '你的引导词'), text: t('Edit bilingual labels and their VA positions. The supplied 97-word list is a starting point; each session retains its configuration.', '编辑中英标签和 VA 坐标。所给 97 个词可作为起点，每次会话保留使用的配置。'), file: 'config/emotion-tags.json', label: t('Emotion word list', '情绪词表') },
    { icon: SlidersHorizontal, title: t('Your annotation space', '你的标注空间'), text: t('Set the circle diameter, up to five guide words, and the X/Y axis names and endpoints. Coordinates continue to use a 0–1 scale.', '设置圆圈直径、最多五个引导词，以及 X/Y 轴名称和端点文案。坐标仍使用 0–1 量表。'), file: 'config/va-interface.json', label: t('Interface configuration', '界面配置') },
    { icon: Palette, title: t('Your color palette', '你的配色'), text: t('Adjust the four corner colors or use the original saturated preset. The default keeps red, orange, blue and green in softer tones.', '调整四角颜色，或选用原版高饱和预设。默认以柔和色调保留红、橙、蓝、绿。'), file: 'config/va-interface-original.json', label: t('Original palette preset', '原版配色预设') },
  ];
  return <div className="page-wrap">
    <header className="page-intro">
      <p className="eyebrow">{t('A DEMO YOU CAN BUILD ON', '从演示开始，构建自己的版本')}</p>
      <h1>{t('Make it yours.', '为你的研究定制。')}</h1>
      <p>{t('Try Mood Rater without an account, then adapt its audio and interface through separate configuration files. Changes apply to your own rebuilt deployment.', '无需账号即可体验 Mood Rater；通过独立配置文件调整音频与界面，重新构建后用于你自己的部署。')}</p>
      <div className="form-actions spaced">
        <a href="/annotate" className="button primary">{t('Open the demo', '打开标注演示')}<ArrowRight size={16}/></a>
        <a href={`${source}docs/CUSTOMIZATION.md`} className="button" target="_blank" rel="noreferrer">{t('Read the setup guide', '阅读配置指南')}<ArrowUpRight size={15}/></a>
      </div>
    </header>
    <section className="two-column" aria-label={t('Customization options', '自定义选项')}>
      {items.map(({ icon: Icon, title, text, file, label }) => <article className="card" key={file}>
        <span className="card-icon"><Icon size={23}/></span>
        <h2 style={{ fontSize: 25, marginBottom: 12 }}>{title}</h2>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.85 }}>{text}</p>
        <a href={`${source}${file}`} className="inline-link spaced" target="_blank" rel="noreferrer">{label}<ArrowUpRight size={14}/></a>
      </article>)}
    </section>
    <article className="rich-text">
      <h2>{t('A small, reusable starting point', '清晰、可复用的起点')}</h2>
      <p>{t('The public demo plays audio in your browser and keeps drafts on your device. No database setup, researcher activation or sign-in is needed for this workflow. Export JSON to preserve raw inputs and interface settings, or CSV for the derived time series.', '公开演示在浏览器播放音频，草稿保留在本机。这一流程无需配置数据库、激活研究者或登录。导出 JSON 可保留原始输入与界面配置，CSV 则提供派生时间序列。')}</p>
      <p>{t('Start with the repository’s demo configuration, change only what your task needs, and keep a versioned copy for each study. The optional collection backend is retained for advanced deployments and is disabled by default.', '从仓库的演示配置开始，只调整任务需要的部分，为每项研究保存带版本的配置。可选研究收集后台保留给进阶部署，默认关闭。')}</p>
      <div className="form-actions">
        <a href={`${source}docs/CUSTOMIZATION.md`} className="inline-link" target="_blank" rel="noreferrer">{t('Configuration and quick start', '配置与快速开始')}<ArrowUpRight size={14}/></a>
        <a href="/about" className="inline-link">{t('Research background and citation', '研究背景与引用')}<ArrowRight size={14}/></a>
      </div>
    </article>
  </div>;
}

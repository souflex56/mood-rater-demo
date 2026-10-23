'use client';

import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../components/LanguageProvider';

const source = 'https://github.com/souflex56/mood-rater-demo/blob/codex/mood-rater-v2/';

export default function CustomizePage() {
  const { t } = useLanguage();
  const items = [
    { title: t('Audio collection', '音频集合'), text: t('Use bundled examples or local audio. Configure the collection for your own deployment.', '使用内置示例或本地音频，也可为独立部署的版本配置音频集合。'), file: 'config/audio-library.json', label: t('Audio configuration', '音频配置') },
    { title: t('Emotion words', '情绪参考词'), text: t('Edit the 97 bilingual words and their valence–arousal coordinates. Each session retains its configuration.', '调整内置 97 个词的中英文文本及愉悦度、唤醒度坐标。每份标注记录保留所用配置。'), file: 'config/emotion-tags.json', label: t('Emotion word list', '情绪参考词表') },
    { title: t('Annotation map', '标注坐标图'), text: t('Set the selection circle, word count (up to five), axis names and endpoint labels. Coordinates remain on a 0–1 scale.', '设置选择圆圈直径、参考词数量（最多 5 个）、坐标轴名称和端点标签。坐标范围保持 0–1。'), file: 'config/va-interface.json', label: t('Interface configuration', '界面配置') },
    { title: t('Colors', '配色'), text: t('Configure the four corner colors. The original palette preset is available as a reference.', '配置坐标图的四角颜色，也可参考原版配色预设。'), file: 'config/va-interface-original.json', label: t('Original palette preset', '原版配色预设') },
  ];
  return <div className="page-wrap">
    <header className="page-intro">
      <h1>{t('Configuration guide', '自定义指南')}</h1>
      <p>{t('Edit the audio and interface configuration files, then rebuild and deploy your own version.', '修改音频与界面的配置文件，重新构建并部署自己的版本。')}</p>
      <div className="form-actions spaced">
        <a href={`${source}docs/CUSTOMIZATION.md`} className="button primary" target="_blank" rel="noreferrer">{t('Read the setup guide', '阅读配置指南')}<ArrowUpRight size={15}/></a>
        <a href="/annotate" className="inline-link">{t('Open workspace', '打开标注工作区')}<ArrowRight size={16}/></a>
      </div>
    </header>
    <section className="two-column customization-grid" aria-label={t('Customization options', '自定义选项')}>
      {items.map(({ title, text, file, label }) => <article className="card" key={file}>
        <h2>{title}</h2>
        <p className="muted">{text}</p>
        <a href={`${source}${file}`} className="inline-link spaced" target="_blank" rel="noreferrer">{label}<ArrowUpRight size={14}/></a>
      </article>)}
    </section>
    <article className="rich-text">
      <h2>{t('Deployment and data', '部署与数据')}</h2>
      <p>{t('Local audio is not uploaded. Drafts stay in this browser and do not include audio files. Export JSON to retain raw inputs and interface settings, or CSV for the resampled time series.', '本地音频不会上传；标注草稿保存在当前浏览器，不包含音频文件。导出 JSON 可保留原始输入与界面配置，CSV 提供重采样后的评分序列。')}</p>
      <p>{t('Keep a versioned configuration for each study. The optional research collection backend is disabled by default and requires a separate deployment.', '请为每项研究保留配置版本。可选的数据收集服务默认关闭，需要另行部署。')}</p>
      <a href="/about" className="inline-link">{t('Research background and citation', '研究背景与引用')}<ArrowRight size={14}/></a>
    </article>
  </div>;
}

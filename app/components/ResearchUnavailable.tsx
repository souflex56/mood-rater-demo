'use client';

import { useLanguage } from './LanguageProvider';

export default function ResearchUnavailable() {
  const { t } = useLanguage();
  return <div className="page-wrap" style={{ maxWidth: 760 }}>
    <header className="page-intro">
      <p className="eyebrow">MOOD RATER DEMO</p>
      <h1>{t('Explore the annotation demo.', '体验情绪标注 Demo。')}</h1>
      <p>{t('This site is a public demo. Choose audio, explore the emotion space, and export your annotations. No account or study invitation is needed.', '当前网站用于公开演示。选择音频、探索情绪空间，并导出你的标注，无需账号或研究邀请。')}</p>
    </header>
    <div className="form-actions">
      <a className="button primary" href="/annotate">{t('Open demo', '打开 Demo')}</a>
      <a className="button" href="/customize">{t('Customize the tool', '自定义工具')}</a>
      <a className="inline-link" href="/">{t('Back to home', '返回首页')}</a>
    </div>
  </div>;
}

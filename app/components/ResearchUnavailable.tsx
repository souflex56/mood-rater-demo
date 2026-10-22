'use client';

import { useLanguage } from './LanguageProvider';

export default function ResearchUnavailable() {
  const { t } = useLanguage();
  return <div className="page-wrap" style={{ maxWidth: 760 }}>
    <header className="page-intro">
      <p className="eyebrow">MOOD RATER DEMO</p>
      <h1>{t('Explore the annotation demo.', '体验标注工作区。')}</h1>
      <p>{t('This site is a public demo. Choose audio, explore the emotion space, and export your annotations. No account or study invitation is needed.', '当前网站提供公开标注工作区。无需账号或研究邀请，即可选择音频、记录情绪变化并导出标注。')}</p>
    </header>
    <div className="form-actions">
      <a className="button primary" href="/annotate">{t('Open demo', '打开标注工作区')}</a>
      <a className="button" href="/customize">{t('Customize the tool', '查看自定义指南')}</a>
      <a className="inline-link" href="/">{t('Back to home', '返回首页')}</a>
    </div>
  </div>;
}

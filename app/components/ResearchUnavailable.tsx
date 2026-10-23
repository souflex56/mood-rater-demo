'use client';

import { useLanguage } from './LanguageProvider';

export default function ResearchUnavailable() {
  const { t } = useLanguage();
  return <div className="page-wrap" style={{ maxWidth: 760 }}>
    <header className="page-intro">
      <h1>{t('Study collection is not enabled', '研究数据收集未启用')}</h1>
      <p>{t('This demo supports local annotation and export. No account or study invitation is needed.', '本演示支持本地标注与导出，无需账号或研究邀请。')}</p>
    </header>
    <div className="form-actions">
      <a className="button primary" href="/annotate">{t('Open workspace', '打开标注工作区')}</a>
      <a className="inline-link" href="/customize">{t('Configuration guide', '自定义指南')}</a>
    </div>
  </div>;
}

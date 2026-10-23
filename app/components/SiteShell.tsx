'use client';

import { AudioLines, Globe2, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

export default function SiteShell({ children }: { children: ReactNode }) {
  const { locale, setLocale, t } = useLanguage();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    ['/', t('Home', '首页')],
    ['/annotate', t('Annotate', '标注工作区')],
    ['/customize', t('Customize', '自定义指南')],
    ['/about', t('Research', '研究背景')],
  ];
  return <>
    <a className="skip-link" href="#main">{t('Skip to content', '跳至内容')}</a>
    <header className="site-header">
      <Link href="/" className="brand" aria-label={t('Mood Rater home', 'Mood Rater 首页')}><span className="brand-mark"><AudioLines size={22}/></span><span>Mood Rater</span></Link>
      <nav className={open ? 'nav-links is-open' : 'nav-links'} aria-label={t('Main navigation', '主导航')}>
        {links.map(([href, label]) => <a key={href} href={href} aria-current={path === href ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</a>)}
      </nav>
      <div className="header-actions">
        <button className="language-toggle" onClick={() => setLocale(locale === 'en' ? 'zh-CN' : 'en')} aria-label={t('Switch to Chinese', '切换为英文')}><Globe2 size={16}/><span>{locale === 'en' ? '中文' : 'EN'}</span></button>
        <button className="mobile-menu icon-button" aria-label={open ? t('Close menu', '收起菜单') : t('Open menu', '展开菜单')} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={20}/> : <Menu size={20}/>}</button>
      </div>
    </header>
    <main id="main">{children}</main>
    <footer className="site-footer">
      <Link href="/" className="footer-brand">Mood Rater</Link>
      <div className="footer-links">
        <a href="/about#data">{t('Data and privacy', '数据说明')}</a>
      </div>
    </footer>
  </>;
}

"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Locale } from '../../lib/types';
// Chinese UI terms: 标注工作区 (workspace), 标注记录 (session), 情绪参考词 (guide words),
// 标注区间 (recording interval), 已标注时长占比 (coverage), 数据收集服务 (backend).
type Language = {locale: Locale; setLocale: (locale: Locale) => void; t: (en: string, zh: string) => string};
const Context = createContext<Language>({locale:'en',setLocale:()=>{},t:(en)=>en});
export function LanguageProvider({children}: {children:ReactNode}) {
  const [locale,setState]=useState<Locale>('en');
  useEffect(()=>{
    let saved: string|null=null;
    try{saved=localStorage.getItem('mood-rater-language');}catch{}
    // Hydrate browser-only preferences after the server's deterministic English render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(saved==='zh-CN'||(!saved&&navigator.language.startsWith('zh'))?'zh-CN':'en');
  },[]);
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  const setLocale=(next:Locale)=>{setState(next);try{localStorage.setItem('mood-rater-language',next);}catch{}};
  return <Context.Provider value={{locale,setLocale,t:(en,zh)=>locale==='zh-CN'?zh:en}}>{children}</Context.Provider>;
}
export const useLanguage=()=>useContext(Context);

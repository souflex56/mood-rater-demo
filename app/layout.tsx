import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from './components/LanguageProvider';
import SiteShell from './components/SiteShell';
export const metadata:Metadata={title:{default:'Mood Rater · Audio emotion annotation',template:'%s · Mood Rater'},description:'Map how emotion changes through sound. A bilingual continuous valence–arousal annotation tool based on Simin Yang’s doctoral research.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><LanguageProvider><SiteShell>{children}</SiteShell></LanguageProvider></body></html>;}

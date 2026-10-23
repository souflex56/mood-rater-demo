'use client';

import { useState } from 'react';
import { ArrowUpRight, Copy, Check } from 'lucide-react';
import { useLanguage } from '../components/LanguageProvider';

const citation = 'S. Yang, C. N. Reed, E. Chew, and M. Barthet, “Examining Emotion Perception Agreement in Live Music Performance,” IEEE Transactions on Affective Computing, vol. 14, no. 2, pp. 1442–1460, 2023. doi: 10.1109/TAFFC.2021.3093787.';

export default function About() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  return <div className="page-wrap" style={{ maxWidth: 850 }}>
    <header className="page-intro">
      <h1>{t('Research and methods', '研究与方法')}</h1>
      <p>{t('Mood Rater is based on Simin Yang’s doctoral research on how emotion perception changes over time in music.', 'Mood Rater 基于 Simin Yang 关于音乐情绪感知随时间变化的博士研究。')}</p>
    </header>
    <article className="rich-text">
      <h2>{t('Annotation dimensions', '标注维度')}</h2>
      <div className="two-column">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('Valence', '愉悦度 Valence')}</h3>
          <p>{t('The horizontal axis runs from negative to positive emotion on a 0–1 scale.', '横轴表示情绪从消极到积极的变化，采用 0–1 量表。')}</p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t('Arousal', '唤醒度 Arousal')}</h3>
          <p>{t('The vertical axis runs from low to high emotional energy. Arousal is not the same as loudness.', '纵轴表示情绪从平静到兴奋的变化，不等同于声音的响度。')}</p>
        </div>
      </div>
      <p>{t('Perceived emotion is what the audio expresses; felt emotion is what you experience while listening. Select one before starting. It remains fixed for that annotation session.', '感知情绪指音频表达出的情绪；自身感受指聆听时体验到的情绪。请在开始前选择标注对象，开始标注后不能更改。')}</p>

      <h2>{t('Research and citation', '研究与引用')}</h2>
      <p>{t('Yang and colleagues examined how agreement between listeners changes during a live musical performance, then explored reasons for differing perceptions in a laboratory study. The article was first published online in 2021 and appeared in volume 14 in 2023.', 'Yang 等人研究了现场音乐表演中，听众情绪感知的一致性如何随时间变化，并通过实验室研究探索感知差异的原因。论文于 2021 年提前在线发表，2023 年正式刊载于第 14 卷。')}</p>
      <div className="citation">{citation}</div>
      <div className="form-actions spaced">
        <button className="button small" onClick={async () => {
          try { await navigator.clipboard.writeText(citation); setCopied(true); }
          catch { setError(t('Copy is unavailable. Select the citation above to copy it.', '无法自动复制，请选择上方引用文本手动复制。')); }
        }}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? t('Copied', '已复制') : t('Copy citation', '复制引用')}</button>
        <a className="inline-link" href="https://ieeexplore.ieee.org/document/9468946" target="_blank" rel="noreferrer">IEEE<ArrowUpRight size={14}/></a>
        <a className="inline-link" href="https://siminyang6.wordpress.com/wp-content/uploads/2021/07/journalpaper_tac_preprint_0628.pdf" target="_blank" rel="noreferrer">{t('Author preprint', '作者预印本')}<ArrowUpRight size={14}/></a>
        <a className="inline-link" href="/citation.bib" download>BibTeX</a>
      </div>
      {error && <p role="status">{error}</p>}

      <h2>{t('Implementation and limits', '实现与限制')}</h2>
      <p>{t('The original study used time-stamped clicks and, for part of its analysis, step resampling at 1 Hz. This edition adds continuous dragging, general audio, local drafts, interval re-recording and 10 Hz derived exports. These are engineering extensions, not a complete replication of the experimental protocol.', '原研究使用带时间戳的点击标注，部分分析采用 1 Hz 阶梯重采样。本版新增连续拖动、通用音频、本地草稿、区间重新标注和 10 Hz 派生导出，属于工程扩展，并非对原实验方案的完整复现。')}</p>
      <p>{t('Only user inputs are observations. Within a recording interval, each value is held until the next input; gaps remain empty. Raw inputs and edit history are retained. Pointer movement is recorded at up to 30 Hz. Export frequency does not imply measurement precision, and response delay is not corrected.', '只有用户输入属于实际观测。标注区间内，两次输入之间保持最近一次评分；未标注区间保留为空。原始输入与修改历史均会保留。指针移动最高按 30 Hz 记录，导出频率不代表测量精度，数据也未校正反应延迟。')}</p>
      <p>{t('Each new input records coordinates, audio position and a device-clock UTC timestamp. Sessions retain the interface configuration used during annotation.', '每次新输入记录坐标、音频播放位置和设备时钟的 UTC 时间戳。标注记录保留当时的界面配置，便于核对参考词的显示条件。')}</p>

      <h2>{t('Emotion words', '情绪参考词')}</h2>
      <p>{t('The VA plane uses red, orange, blue and green hues. A selection circle with a diameter of one-eighth of the plane width shows up to five nearby words, ordered by distance below the plane. If no words fall within the circle, none are shown.', 'VA（愉悦度—唤醒度）平面采用红、橙、蓝、绿四色。以点击位置为圆心，在直径为平面宽度八分之一的圆内，按距离选取最多 5 个情绪参考词，显示在图下；圆内没有词时不显示。')}</p>
      <p>{t('The 97 words, coordinates and Chinese translations preserve the supplied list. As described in the thesis, editorial ILM tags are mapped to ANEW mean VA values.', '内置词表保留所提供的 97 个词、坐标和中文翻译。如论文所述，ILM 编辑标签按 ANEW 的平均 VA 值定位。')}</p>

      <h2 id="data">{t('Audio and data', '音频与数据')}</h2>
      <p>{t('The public workspace requires no account. Local audio plays in your browser and is not uploaded. Annotations are saved in this browser and are not submitted to a research service. Clearing browser storage removes drafts; export important work. After a refresh, select local audio again.', '公开工作区无需注册。本地音频在浏览器中播放，不会上传；标注保存在当前浏览器，不会提交到数据收集服务。清除浏览器存储会删除草稿，请及时导出重要标注。刷新后需重新选择本地音频。')}</p>
      <p>{t('Audio collections, emotion words, selection circles, colors and axis labels can be configured separately. Saved sessions retain their configuration when settings change. An optional research collection backend is available for separate deployments and is disabled in this demo. No advertising or third-party analytics are included.', '音频库、情绪参考词、选择圆圈、配色和坐标轴标签可分别配置，后续修改不会改变已有标注记录所用的配置。项目保留可选的数据收集服务，供独立部署时启用；本演示默认关闭。本站不包含广告或第三方行为分析。')}</p>

      <h2>{t('Sample audio', '示例音频')}</h2>
      <p>{t('Bundled examples are locally generated synthetic sounds for learning the controls. They are not validated research stimuli or normative emotion examples.', '内置示例采用本项目生成的合成音，仅供熟悉操作，不是经过验证的研究刺激材料或标准情绪示例。')}</p>
      <div className="form-actions">
        <a className="button primary" href="/annotate?demo=1">{t('Try sample audio', '试用示例音频')}</a>
        <a className="inline-link" href="/customize">{t('Configuration guide', '自定义指南')}<ArrowUpRight size={14}/></a>
      </div>
    </article>
  </div>;
}

# Bundled recording credits / 内置录音说明

Four 60-second excerpts from actual performances and human narration. They are examples for learning the annotation tool, with no reference emotion labels or experimental validation.

四段音频均为 60 秒，来自实际演奏和真人朗读。用于体验标注工具，不预设情绪评分，也未作实验效度验证。

| File / 文件 | Recording / 录音 | Original interval / 原录音区间 | License / 授权 |
| --- | --- | --- | --- |
| `chopin-nocturne-op9-no2-60s.mp3` | Frédéric Chopin, Nocturne Op. 9 No. 2; piano: **Peter Johnston** | 0:03.430–1:03.430 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `vivaldi-spring-allegro-60s.mp3` | Antonio Vivaldi, The Four Seasons: Spring, movement 1, Allegro; violin: **John Harrison**, conductor: **Robert Turizziani**, **Wichita State University Chamber Players**; live, 2000-02-06 | 0:00.700–1:00.700 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `alice-rabbit-hole-narration-60s.mp3` | Lewis Carroll, Alice’s Adventures in Wonderland, version 2, chapter 1, Down the Rabbit-Hole; English reader: **Kara Shallenberg**, LibriVox, 2010 | 1:55.780–2:55.780 | [Public domain (LibriVox)](https://librivox.org/pages/public-domain/) |
| `zhufu-mandarin-narration-60s.mp3` | 鲁迅 Lu Xun, **祝福 / New Year’s Sacrifice**; Mandarin reader: **Jing Li**; LibriVox, Multilingual Short Works Collection 026, section 02, 2020 | 0:36.360–1:36.360 | [Public domain (LibriVox)](https://librivox.org/pages/public-domain/) |

The Vivaldi recording is copyright John Harrison; the excerpt is distributed under CC BY-SA 4.0. LibriVox volunteers donate their recordings to the public domain, and its policy identifies their public-domain status in the USA. The English text is Lewis Carroll’s original 1865 work; the Chinese text is Lu Xun’s original Chinese work, first published in 1924. No modern translations are included.

维瓦尔第录音版权归 John Harrison，片段依 CC BY-SA 4.0 分发。LibriVox 志愿者将录音捐赠至公共领域，其政策说明了美国法律适用范围。英文文本为 Lewis Carroll 的 1865 年原文，中文文本为鲁迅于 1924 年发表的《祝福》原文，不涉及现代译本。

## Sources / 原始来源

1. **Piano · Chopin: Nocturne Op. 9 No. 2**

   [Recording and license record / 录音与授权页面](https://commons.wikimedia.org/wiki/File:Chopin_Nocturne_No._2_in_E_Flat_Major,_Op._9.ogg) · [Original audio / 原音频](https://upload.wikimedia.org/wikipedia/commons/0/04/Chopin_Nocturne_No._2_in_E_Flat_Major%2C_Op._9.ogg)

   Original SHA-256: `93e15e61baacdf129f21eacf8404ae5c2bd0f41e0256319597de54c40aa1cb22`

   Excerpt SHA-256: `5710ee0c0c7fdf44f34561cb7e0b0bb7dbc4cd915d01e0d81f9056c30760eb4c`

2. **Strings · Vivaldi: Spring, Allegro**

   [Recording and license record / 录音与授权页面](https://commons.wikimedia.org/wiki/File:Vivaldi_-_Four_Seasons_1_Spring_mvt_1_Allegro_-_John_Harrison_violin.oga) · [Original audio / 原音频](https://upload.wikimedia.org/wikipedia/commons/f/ff/Vivaldi_-_Four_Seasons_1_Spring_mvt_1_Allegro_-_John_Harrison_violin.oga)

   Original SHA-256: `67ada06f97697196d67ce26c06e5c61700e7b79b0321b7f04571a4eb7435d4d3`

   Excerpt SHA-256: `b9d391e3a35b432bafb93514a559cdfdd9f838f530c55a824c8d32effdb7952d`

3. **English speech · Alice in Wonderland**

   [Recording and license record / 录音与授权页面](https://librivox.org/alices-adventures-in-wonderland-by-lewis-carroll-4/) · [Original audio / 原音频](https://www.archive.org/download/alices_adventures_1003/alices_adventures_01_carroll_64kb.mp3)

   Original SHA-256: `da919b104680c7184a3451ec2cdd65ad0b48ebc0b4eb2ec91620dd9b29e623c6`

   Excerpt SHA-256: `d0f6bf87ff7a9350242af99e7dcc98c1f1aaeb1f35a8a92bf23b74517e71dc2c`

4. **Mandarin speech · Lu Xun: New Year’s Sacrifice**

   [Recording and license record / 录音与授权页面](https://librivox.org/multilingual-short-works-collection-026-poetry-prose-by-various/) · [Original audio / 原音频](https://www.archive.org/download/multilingual_026_2011_librivox/msw026_02_newyearsacrifice_lu_jin_64kb.mp3)

   Original SHA-256: `c4e50fbad06b932b804b508591baf55e6fd8ff9608796fb063be18c564efd89e`

   Excerpt SHA-256: `10b4854fdd259c6a9f5191caa97729637e1c87971e418594c27621f605189a9f`

## Processing and verification / 处理与验证

Prepared on 2026-10-28 using [`scripts/prepare-audio-excerpts.py`](../../scripts/prepare-audio-excerpts.py). Only each stated continuous interval is retained. Opening silence and audiobook introductions are excluded. Natural pauses inside the narration remain. Excerpts use 44.1 kHz MP3, 128 kbps stereo for music and 96 kbps mono for speech. Timestamps are reset after trimming, before applying 15 ms fades at both edges. Speed, pitch and gain are unchanged; no speech generation, remixing or denoising is applied.

于 2026-10-28 使用 [`scripts/prepare-audio-excerpts.py`](../../scripts/prepare-audio-excerpts.py) 制作，仅保留上述连续区间。跳过开头空白和朗读介绍，保留正文中的自然停顿。MP3 采样率 44.1 kHz；音乐为 128 kbps 双声道，朗读为 96 kbps 单声道。先截取，再重置时间戳，最后在两端各作 15 ms 淡入淡出，避免将片段后半段错误静音。未改变速度、音高或增益，未生成语音、混音或降噪。

To reproduce, download the original files using the links above, name them `chopin.ogg`, `vivaldi.ogg`, `alice.mp3` and `zhufu.mp3` in one directory, then run:

复现时，下载以上原音频，命名为 `chopin.ogg`、`vivaldi.ogg`、`alice.mp3`、`zhufu.mp3` 并放入同一目录，然后执行：

```sh
python3 scripts/prepare-audio-excerpts.py /path/to/original-recordings
npm test
```

With FFmpeg installed, `tests/audio-quality.test.ts` decodes every excerpt and checks actual 60-second duration, opening and trailing silence, the longest quiet run, and audible content in each 10-second section. These signal checks catch the former 28.5-second silent tail; checking file length or player progress alone does not. Without FFmpeg this one test is explicitly skipped; run it in a maintenance environment with FFmpeg when changing assets. These are signal checks, not independent human listening-quality ratings.

安装 FFmpeg 后，`tests/audio-quality.test.ts` 会解码每段音频，检查真实 60 秒时长、首尾空白、最长连续静音和每 10 秒区间的有效声音。这些信号检查可检出旧英文片段 28.5 秒的静音尾部；只检查文件时长或播放进度无法检出。缺少 FFmpeg 时，此项测试明确跳过；变更素材时须在安装 FFmpeg 的维护环境执行。信号检查不等同于独立人工音质评分。

Stable new IDs keep the 60-second recordings separate from the retired 30/31-second examples. Old files remain for historical references and are not offered in the current selector. Practice uses the same 60-second Chopin excerpt, and practice annotations remain unsaved. The CC BY-SA 4.0 license applies to the Vivaldi excerpt, not unrelated application code.

新版使用新 ID，避免将 60 秒录音关联到旧 30／31 秒音频的标注。旧文件仅保留用于历史引用，不出现在当前选择列表。标注练习也使用 60 秒肖邦片段，练习记录仍不会保存。CC BY-SA 4.0 适用于维瓦尔第片段，不延伸至无关的应用代码。

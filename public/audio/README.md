# Bundled recording credits / 内置录音说明

These are excerpts from actual performances and human narration, not synthesized test tones or text-to-speech. They are examples for learning the annotation tool, with no reference emotion labels or experimental validation.

这些片段来自实际演奏和真人朗读，非合成测试音或语音合成。用于体验标注工具，不预设情绪评分，也未作实验效度验证。

| File / 文件 | Recording / 录音 | Original interval / 原录音区间 | License / 授权 |
| --- | --- | --- | --- |
| `chopin-nocturne-op9-no2-30s.mp3` | Frédéric Chopin, Nocturne Op. 9 No. 2; piano: **Peter Johnston** | 0:00–0:30 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `vivaldi-spring-allegro-30s.mp3` | Antonio Vivaldi, The Four Seasons: Spring, movement 1, Allegro; violin: **John Harrison**, conductor: **Robert Turizziani**, **Wichita State University Chamber Players**; live, 2000-02-06 | 0:00–0:30 | Recording copyright John Harrison; excerpt distributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `alice-rabbit-hole-narration-31s.mp3` | Lewis Carroll, Alice’s Adventures in Wonderland, version 2, chapter 1, Down the Rabbit-Hole; English reader: **Kara Shallenberg**, LibriVox, 2010 | 0:28.500–0:59.500 | [LibriVox public-domain dedication](https://librivox.org/pages/public-domain/); LibriVox identifies its recordings as public domain in the USA |

The literary text is the original English work by Lewis Carroll (1832–1898), published in 1865. No modern translation is included. LibriVox volunteers donate their recordings to the public domain; their policy explains its US basis.

文学文本使用 Lewis Carroll（1832–1898）于 1865 年出版的英文原文，不涉及现代译本。LibriVox 志愿者将录音捐赠至公共领域；其政策说明了美国法律适用范围。

## Sources / 原始来源

1. **Piano · Chopin: Nocturne Op. 9 No. 2**

   [Recording and license record / 录音与授权页面](https://commons.wikimedia.org/wiki/File:Chopin_Nocturne_No._2_in_E_Flat_Major,_Op._9.ogg) · [Original audio / 原音频](https://upload.wikimedia.org/wikipedia/commons/0/04/Chopin_Nocturne_No._2_in_E_Flat_Major%2C_Op._9.ogg)

   Original SHA-256: `93e15e61baacdf129f21eacf8404ae5c2bd0f41e0256319597de54c40aa1cb22`

   Excerpt SHA-256: `01ca78bb92b407a91dae58f509a9f8ebbb6b54a75aac3ee53374b8294faed15b`

2. **Strings · Vivaldi: Spring, Allegro**

   [Recording and license record / 录音与授权页面](https://commons.wikimedia.org/wiki/File:Vivaldi_-_Four_Seasons_1_Spring_mvt_1_Allegro_-_John_Harrison_violin.oga) · [Original audio / 原音频](https://upload.wikimedia.org/wikipedia/commons/f/ff/Vivaldi_-_Four_Seasons_1_Spring_mvt_1_Allegro_-_John_Harrison_violin.oga)

   Original SHA-256: `67ada06f97697196d67ce26c06e5c61700e7b79b0321b7f04571a4eb7435d4d3`

   Excerpt SHA-256: `4dbd1185f6a8bdfe439299bd8fd34cda786d3ddee5bec0a3737dd56bc924cf7a`

3. **English speech · Alice in Wonderland**

   [Recording and license record / 录音与授权页面](https://librivox.org/alices-adventures-in-wonderland-by-lewis-carroll-4/) · [Original audio / 原音频](https://www.archive.org/download/alices_adventures_1003/alices_adventures_01_carroll_64kb.mp3)

   Original SHA-256: `da919b104680c7184a3451ec2cdd65ad0b48ebc0b4eb2ec91620dd9b29e623c6`

   Excerpt SHA-256: `98d04b78de9659572ea3a381d6544f0ce00b48be260c01d45b2afdb470084dcd`

## Processing / 处理方式

Prepared on 2026-10-28 with FFmpeg. Only the stated continuous interval is retained. Excerpts use 44.1 kHz MP3, 128 kbps stereo for music and 96 kbps mono for speech. A 15 ms fade at each edge prevents cut clicks. Speed, pitch and gain are unchanged; no speech generation, remixing, denoising or emotion processing is applied. The Vivaldi excerpt remains available under CC BY-SA 4.0; this license applies to that audio file, not to unrelated application code.

于 2026-10-28 使用 FFmpeg 制作，仅保留上述连续区间。MP3 采样率 44.1 kHz；音乐为 128 kbps 双声道，朗读为 96 kbps 单声道。两端各作 15 ms 淡入淡出以防截断爆音；未改变速度、音高或增益，也未生成语音、混音、降噪或处理情绪。维瓦尔第片段依 CC BY-SA 4.0 分发，该授权适用于对应音频文件，不延伸至无关的应用代码。

Stable new IDs distinguish these recordings from the retired synthetic examples. The old WAV files and legacy `/demo.wav` remain available for historical references; they are not offered in the current selector. The Practice button uses the Chopin excerpt, and practice annotations remain unsaved.

新录音使用新 ID，与旧合成音示例区分。旧 WAV 与原版 `/demo.wav` 保留用于历史引用，不出现在当前选择列表。标注练习使用肖邦片段，练习记录仍不会保存。

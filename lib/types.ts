import type { VAInterfaceProfile } from './va-config.ts';

export type Locale = 'en' | 'zh-CN';
export type EmotionTarget = 'perceived' | 'felt';
export type AudioAsset = {
  id: string; name: string; size: number; mimeType: string; duration: number;
  sha256?: string; url?: string; studyId?: string; status?: 'pending' | 'ready';
};
export type RatingEvent = {
  id: string; sequence: number; mediaTime: number; monotonicTime: number;
  utcTimestamp?: string;
  valence: number; arousal: number; input: 'pointer' | 'keyboard' | 'slider' | 'legacy';
};
export type RecordingPass = {
  id: string; order: number; start: number; end: number | null;
  events: RatingEvent[]; revoked: boolean;
  endReason?: 'stop' | 'pause' | 'seek' | 'ended' | 'hidden' | 'buffering' | 'interrupted' | 'error';
};
export type DerivedSample = {
  mediaTime: number; valence: number | null; arousal: number | null;
  sourceEventId: string | null; passId: string | null;
  valueOrigin: 'new_event' | 'held' | 'missing';
};
export type AnnotationSessionV2 = {
  schemaVersion: 2; id: string; createdAt: string; updatedAt: string;
  mode: 'free' | 'research' | 'legacy'; locale: Locale; emotionTarget: EmotionTarget | 'unknown';
  asset: AudioAsset; studyId?: string; studyVersion?: number; participantId?: string;
  researchCode?: string; notes: string; revision: number;
  protocol: { scale: [0, 1]; sampleRateHz: 10; resampling: 'zero_order_hold'; version: 1 };
  interfaceProfile?: VAInterfaceProfile;
  passes: RecordingPass[]; legacy?: boolean;
  legacySource?: {timestamp?:string; totalRatings?:number; ratings:unknown[]};
  importedFromSessionId?: string;
};
export type Study = {
  id: string; token: string; version: number; title: string; titleZh: string;
  description: string; descriptionZh: string; consent: string; consentZh: string;
  emotionTarget: EmotionTarget; status: 'draft' | 'published' | 'closed';
  createdAt: string; assets: AudioAsset[];
};
export type ResearchContext = {
  study: Study; participantId: string; participationToken: string; researchCode: string;
};
export type SubmissionSummary = {
  id: string; studyId: string; assetId: string; participantId: string; researchCode: string;
  revision: number; status: 'pending' | 'ready'; createdAt: string;
  coverage: number; eventCount: number; passCount: number; size: number;
};

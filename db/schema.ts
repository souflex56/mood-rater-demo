import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const settings = sqliteTable('settings', { key: text('key').primaryKey(), value: text('value').notNull() });
export const studies = sqliteTable('studies', {
  id: text('id').primaryKey(), token: text('token').notNull().unique(), familyId: text('family_id').notNull(),
  version: integer('version').notNull(), title: text('title').notNull(), titleZh: text('title_zh').notNull(),
  description: text('description').notNull(), descriptionZh: text('description_zh').notNull(),
  consent: text('consent').notNull(), consentZh: text('consent_zh').notNull(),
  emotionTarget: text('emotion_target', { enum: ['perceived', 'felt'] }).notNull(),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'), createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('study_family_version').on(t.familyId, t.version)]);
export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(), studyId: text('study_id').notNull().references(() => studies.id),
  name: text('name').notNull(), size: integer('size').notNull(), mimeType: text('mime_type').notNull(), duration: real('duration').notNull(),
  position: integer('position').notNull(), objectKey: text('object_key').notNull(),
  status: text('status', { enum: ['pending', 'ready'] }).notNull().default('pending'), createdAt: text('created_at').notNull(),
}, t => [index('assets_study').on(t.studyId, t.position)]);
export const audioUploads = sqliteTable('audio_uploads', {
  id: text('id').primaryKey(), assetId: text('asset_id').notNull().references(() => assets.id), multipartId: text('multipart_id').notNull(),
  objectKey: text('object_key').notNull(), size: integer('size').notNull(), chunkSize: integer('chunk_size').notNull(), createdAt: text('created_at').notNull(),
});
export const audioParts = sqliteTable('audio_parts', {
  id: text('id').primaryKey(), uploadId: text('upload_id').notNull().references(() => audioUploads.id), partIndex: integer('part_index').notNull(),
  etag: text('etag').notNull(), size: integer('size').notNull(),
}, t => [uniqueIndex('audio_part_identity').on(t.uploadId, t.partIndex)]);
export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(), studyId: text('study_id').notNull().references(() => studies.id), tokenHash: text('token_hash').notNull().unique(),
  researchCode: text('research_code').notNull(), createdAt: text('created_at').notNull(),
}, t => [index('participants_study').on(t.studyId)]);
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(), studyId: text('study_id').notNull().references(() => studies.id), assetId: text('asset_id').notNull().references(() => assets.id),
  participantId: text('participant_id').notNull().references(() => participants.id), sessionId: text('session_id').notNull(), researchCode: text('research_code').notNull(),
  revision: integer('revision').notNull(), status: text('status', { enum: ['pending', 'ready'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(), inputSha256: text('input_sha256').notNull(), packageSha256: text('package_sha256'),
  size: integer('size').notNull(), packageSize: integer('package_size'), objectKey: text('object_key').notNull(),
  coverage: real('coverage').notNull().default(0), eventCount: integer('event_count').notNull().default(0), passCount: integer('pass_count').notNull().default(0),
}, t => [index('submissions_list').on(t.createdAt, t.id), index('submissions_study').on(t.studyId, t.assetId, t.participantId)]);
export const submissionParts = sqliteTable('submission_parts', {
  id: text('id').primaryKey(), submissionId: text('submission_id').notNull().references(() => submissions.id), partIndex: integer('part_index').notNull(),
  sha256: text('sha256').notNull(), size: integer('size').notNull(), objectKey: text('object_key').notNull(),
}, t => [uniqueIndex('submission_part_identity').on(t.submissionId, t.partIndex)]);

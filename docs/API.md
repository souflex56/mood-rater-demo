# Research API (v2)

The public demo defaults to `researchEnabled: false` in `config/project.json`. In this mode all research routes return 404; `GET /api/identity` returns `{user:null,isAdmin:false,canBootstrap:false,researchEnabled:false}` without accessing identity or storage. The API below applies only after explicitly enabling and configuring the optional research backend. Local audio annotation and export require none of these endpoints.

公开演示默认关闭研究服务。下列接口仅适用于明确启用并配置后的可选后台；本地音频标注与导出无需调用这些接口。

All routes are same-origin JSON unless stated otherwise. Errors are `{error, details?}` and meaningful 4xx/503 status codes. Browser mutations reject foreign `Origin` / `Sec-Fetch-Site: cross-site`. Responses are private/non-cacheable except private audio. No participant results are publicly enumerable.

## Owner identity

- `GET /api/identity` → `{user: {userId,email,displayName,fullName}|null,isAdmin,canBootstrap}`.
- `POST /api/admin/bootstrap` → same response. This only works for the signed-in account whose verified platform email matches secret `ADMIN_BOOTSTRAP_EMAIL`, with no existing owner. The first authorized binding atomically pins `settings.admin_user_id`. `ADMIN_USER_ID`, if configured, overrides the pinned setting. There is no arbitrary first-user administration.
- All other `/api/admin/**` routes require the single owner. Authenticated headers must be supplied/stripped by the Sites gateway; do not expose the origin worker directly with untrusted forwarded identity headers. `local_seedy` is accepted only in a dev build on a loopback URL using the starter's loopback-only local login.

## Studies

- `GET /api/admin/studies` → `{studies: Study[]}` (latest 200).
- `POST /api/admin/studies` with `{title,titleZh?,description?,descriptionZh?,consent,consentZh?,emotionTarget?}` → `{study}`; creates draft v1. Emotion target defaults to `perceived`.
- `PATCH /api/admin/studies/:id` with `{action:'update'|'publish'|'close'|'clone',config?: <complete configuration above>,assetIds?: string[]}` → `{study}`. Update requires draft; `assetIds` is the complete ordered list of current assets. Publish requires at least one asset and every asset ready. Close requires published. Clone creates a new draft version with a new invite token and asset identities, reusing immutable stored audio. Published/closed settings cannot be edited; closing does not invalidate exports or in-progress upload retries.
- `GET /api/study/:token` → `{study}` for published/closed studies. Drafts are private; closed study metadata remains readable so participants can understand closure.
- `POST /api/study/:token/participate` with `{consent:true,researchCode?:string}` → `{participantId,participationToken}`. Published studies only. The credential is cryptographically random, stored hashed, bound to the study and participant. Keep it only in local participant state; do not place it in URLs or logs.

Study assets include an `url` at `/api/study/:token/audio/:assetId`. The unguessable invite grants access to its audio, not results. `GET` and `HEAD` support a single byte range, suffix ranges and `416` for invalid ranges.

## Resumable audio uploads

Audio metadata is owner-supplied and browser-measured, with no server transcoding: duration `(0,1800]` seconds; size `(0,104857600]` bytes; audio MIME type; max 100 assets/study.

1. `POST /api/admin/studies/:id/uploads` with `{name,size,mimeType,duration}` → `{uploadId,assetId,chunkSize:5242880,chunkCount}`.
2. `GET /api/admin/uploads/:uploadId` → `{uploadId,assetId,chunkSize,chunkCount,uploadedParts:number[],status}` for recovery. Part indices are zero-based.
3. `PUT /api/admin/uploads/:uploadId/chunks/:index`, raw binary, exact expected bytes. Retry replaces the same multipart part. → `{index,received:true}`.
4. `POST /api/admin/uploads/:uploadId/complete` → `{asset}`. R2 multipart completion and object size are verified before `ready`; retry reconciles an R2 object whose D1 update was interrupted.
5. `DELETE /api/admin/assets/:assetId` removes a draft asset and aborts incomplete upload. Audio shared by another version is retained.

## Resumable immutable submissions

Serialize the exact `AnnotationSessionV2` JSON, UTF-8 encode, and hash these bytes with SHA-256. Close any active recording pass before submitting. Maximum input: 32 MiB and 150,000 raw events. Partial or empty annotation is valid; validity does not imply full coverage. Every session identity, protocol, target, version and asset must match the assigned study. A raw input immediately after an interruption boundary is retained for audit if it is within the audio duration; resampling excludes any input outside the finalized pass interval `[start,end)`, so retaining that event does not extend coverage.

1. `POST /api/submissions/init` with `{participationToken,submissionId,sessionId,assetId,revision,size,sha256}` → `{submissionId,status,chunkSize:1048576,chunkCount,uploadedParts:number[]}`. Persist a stable submission UUID bound to the exact payload; retry with that same pair. The client derives it from the payload SHA-256. A changed revision/payload requires a new UUID. A reused UUID with different data is rejected. New uploads require published status; uploads already initialized can finish after closure.
2. `PUT /api/submissions/:submissionId/chunks/:index`, raw exact-length bytes, with `Authorization: Bearer <participationToken>` → `{index,received:true}`. Each chunk has a server SHA-256; retries cannot replace a chunk with different bytes.
3. `GET /api/submissions/:submissionId`, same authorization → upload progress.
4. `POST /api/submissions/:submissionId/complete`, same authorization → `{submission: SubmissionSummary}`. Only `status:'ready'` confirms durable submission. Retry safely reconciles R2 success followed by D1 failure.

The server checks the original byte checksum, validates the session, computes 10 Hz held samples and coverage, and commits immutable JSON `{schemaVersion:2,submittedAt,inputSha256,session,samples,stats}` to R2 with a package checksum. D1 holds indexes/stats, not raw samples. The normalized session uses canonical server audio metadata; `inputSha256` refers to the exact original uploaded bytes before that normalization. Pending rows appear in admin results but cannot be exported as complete. The UI must keep pending work on failure rather than displaying success.

## Results and export

- `GET /api/admin/submissions?studyId=&assetId=&participantId=&cursor=` → `{submissions: SubmissionSummary[],nextCursor:string|null}`; pages of 50, newest first.
- `GET /api/admin/submissions/:id/export?format=json|csv` downloads one ready package; `X-Package-SHA256` reports the stored JSON package hash (also for CSV derived from that package).
- `GET /api/admin/export?studyId=&assetId=&participantId=&format=ndjson|csv` downloads every matching ready result, pagewise, one R2 package at a time. NDJSON rows contain `{submission,package}`; CSV contains 10 Hz samples plus identifiers. A storage read failure aborts the stream rather than silently omitting a result.

CSV columns: `submission_id,study_id,asset_id,participant_id,research_code,revision,emotion_target,media_time,valence,arousal,value_origin,source_event_id,pass_id,source_event_utc_timestamp`. Missing scores are empty fields. User strings are escaped and spreadsheet formula prefixes neutralized.

## Operations and limits

Apply generated `drizzle/*.sql` migrations before serving requests. Bind `DB` and `BUCKET`; configure a real owner ID or designated bootstrap email before opening a public research invitation. Production secrets must never appear in tracked source. Free-mode audio and annotations remain in the browser.

R2 and D1 do not share a transaction. Completion deliberately persists/checksums R2 first, then marks D1 ready; retry repairs the latter. Study clones and their asset indexes are inserted in one D1 batch. Audio metadata is measured on the trusted owner's browser; uploaded media contents are not decoded or duration-validated by the worker. Invite URLs are bearer access to study materials and should only be shared with intended participants. Closed studies stop new participants/new uploads; existing submissions remain exportable.

New raw events include ISO UTC `utcTimestamp`; missing UTC on historical v2 events remains absent. Optional `interfaceProfile` stores the validated VA configuration and full tag list. New clients snapshot it; older v2 uploads without it remain compatible. CSV `source_event_utc_timestamp` refers to the original event, including on held rows; unknown values are empty.

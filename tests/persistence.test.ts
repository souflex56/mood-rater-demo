import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../lib/annotation.ts';
import { deleteSession, loadParticipation, loadSession, loadSessions, saveParticipation, saveSession } from '../lib/persistence.ts';
import type { ResearchContext } from '../lib/types.ts';

const context: ResearchContext = {
  study: { id: 'study-1', token: 'invitation-1', version: 1, title: 'Test study', titleZh: '', description: '', descriptionZh: '', consent: 'Test consent', consentZh: '', emotionTarget: 'perceived', status: 'published', createdAt: new Date().toISOString(), assets: [] },
  participantId: 'participant-1', participationToken: 'a'.repeat(64), researchCode: '',
};

test('unavailable IndexedDB fails explicitly without claiming a save or falling back to localStorage', async () => {
  const session = createSession({ id: 'test', name: 'test.wav', size: 10, duration: 1, mimeType: 'audio/wav' }, 'en', 'felt');
  await assert.rejects(saveSession(session), /IndexedDB is unavailable/);
  await assert.rejects(loadSession(session.id), /IndexedDB is unavailable/);
  await assert.rejects(loadSessions(), /IndexedDB is unavailable/);
  await assert.rejects(deleteSession(session.id), /IndexedDB is unavailable/);
  await assert.rejects(saveParticipation('invitation-1', context), /IndexedDB is unavailable/);
  await assert.rejects(loadParticipation('invitation-1'), /IndexedDB is unavailable/);
});

test('participation storage refuses a credential bound to another invitation', async () => {
  await assert.rejects(saveParticipation('another-invitation', context), /do not match/);
  await assert.rejects(saveParticipation('invitation-1', { ...context, participationToken: '' }), /do not match/);
  assert.equal(await loadParticipation(''), null);
});

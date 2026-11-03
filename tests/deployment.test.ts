import test from 'node:test';
import assert from 'node:assert/strict';
import { disabledResearchResponse } from '../lib/server/demo-api.ts';
import { authenticatedProxyUser, signInPath } from '../lib/server/auth.ts';

test('the default app rejects collection and never trusts forwarded identities', async () => {
  const headers = { 'x-mood-rater-user-id': 'owner', 'x-mood-rater-user-email': 'owner@example.test', 'oai-authenticated-user-id': 'owner' };
  const identity = disabledResearchResponse(new Request('https://example.test/api/identity', { headers }));
  assert.deepEqual(await identity.json(), { user: null, isAdmin: false, canBootstrap: false, researchEnabled: false });
  for (const path of ['/api/admin/studies', '/api/study/token/participate', '/api/submissions/init']) {
    const response = disabledResearchResponse(new Request(`https://example.test${path}`, { method: 'POST', headers }));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('optional proxy authentication fails closed without its separate secret', async () => {
  const secret = 'a-local-fixture-secret-with-at-least-32-characters';
  const claims = { 'x-mood-rater-user-id': 'owner', 'x-mood-rater-user-email': 'owner@example.test' };
  const request = (extra: Record<string, string> = {}) => new Request('https://example.test/admin', { headers: { ...claims, ...extra } });
  assert.equal(await authenticatedProxyUser(request(), secret), null);
  assert.equal(await authenticatedProxyUser(request({ 'x-mood-rater-auth-key': secret })), null);
  assert.equal(await authenticatedProxyUser(request({ 'x-mood-rater-auth-key': 'wrong' }), secret), null);
  assert.equal(await authenticatedProxyUser(request({ 'x-mood-rater-auth-key': 'short' }), 'short'), null);
  assert.equal(await authenticatedProxyUser(request({ 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': 'owner@example.test' }), secret), null);
  assert.deepEqual(await authenticatedProxyUser(request({ 'x-mood-rater-auth-key': secret }), secret), { userId: 'owner', email: 'owner@example.test', displayName: 'owner@example.test' });
  assert.equal(await authenticatedProxyUser(new Request('https://example.test', { headers: { 'x-mood-rater-auth-key': secret } }), secret), null);
});

test('sign-in links accept only local paths and reject external or ambiguous destinations', () => {
  assert.equal(signInPath('/login?return_to=%2Fadmin'), '/login?return_to=%2Fadmin');
  for (const value of [undefined, '', '//evil.test', 'https://evil.test', '/\\evil.test', '/login\nmalformed']) assert.equal(signInPath(value), null);
});

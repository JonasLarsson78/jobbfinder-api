import test from 'node:test';
import assert from 'node:assert/strict';
import { applyExcludeFilters } from '../lib/excludeFilter.js';

test('applyExcludeFilters removes matching afMatches and linkedinMatches and adjusts total', () => {
  const mapped = {
    afMatches: [
      { headline: 'Sommarvikariat för lärarassistent', conditions: 'Heltid' },
      { headline: 'Senior utvecklare', conditions: 'Heltid' },
    ],
    linkedinMatches: [
      { title: 'Praktikant - utveckling', company: 'Acme' },
      { title: 'Senior utvecklare', company: 'Beta' },
    ],
    total: { value: 4 },
  };

  const res = applyExcludeFilters(mapped, ['vikariat', 'praktik']);

  assert.equal(res.afMatches.length, 1, 'afMatches should have removed one item');
  assert.equal(res.linkedinMatches.length, 1, 'linkedinMatches should have removed one item');
  assert.equal(res.total.value, 2, 'total should be adjusted to remaining count');

  // Ensure IDs exist and are unique across results
  const ids = [];
  for (const a of res.afMatches) {
    assert.ok(a.id != null, 'afMatch should have id');
    ids.push(String(a.id));
  }
  for (const l of res.linkedinMatches) {
    assert.ok(l.id != null, 'linkedinMatch should have id');
    ids.push(String(l.id));
  }
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, 'ids should be unique across items');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { enforceMandatoryAiSafetyRules } from '../lib/admin.mjs';

test('mandatory AI medical safety rules cannot be disabled by an admin request', () => {
  const result = enforceMandatoryAiSafetyRules({
    noDiagnosis: false,
    noMedicationChange: false,
    urgentEscalation: false,
    requireKnowledgeSources: false,
    message: 'custom explanation'
  });

  assert.equal(result.noDiagnosis, true);
  assert.equal(result.noMedicationChange, true);
  assert.equal(result.urgentEscalation, true);
  assert.equal(result.requireKnowledgeSources, true);
  assert.equal(result.message, 'custom explanation');
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ISSUE_QUANTITY_FIELDS,
  isReferenceCardType,
  shouldShowCardHolder,
} from '../src/utils/rationRules.ts';

describe('ration issue rules', () => {
  it('only asks for rice and ragi quantities while issuing ration', () => {
    assert.deepEqual(
      ISSUE_QUANTITY_FIELDS.map(field => field.key),
      ['riceKg', 'ragiKg']
    );
    assert.deepEqual(
      ISSUE_QUANTITY_FIELDS.map(field => field.label),
      ['Rice quantity', 'Ragi quantity']
    );
  });
});

describe('card holder rules', () => {
  it('treats NPHH card types as removable reference cards', () => {
    assert.equal(isReferenceCardType('NPHH'), true);
    assert.equal(isReferenceCardType('NPHH(NK)'), true);
    assert.equal(isReferenceCardType(' nphh reference '), true);
  });

  it('keeps normal ration card types visible', () => {
    assert.equal(shouldShowCardHolder({ cardType: 'PHH(NK)' }), true);
    assert.equal(shouldShowCardHolder({ cardType: 'NCS' }), true);
    assert.equal(shouldShowCardHolder({ cardType: '' }), true);
  });

  it('hides NPHH card holders from active card lists', () => {
    assert.equal(shouldShowCardHolder({ cardType: 'NPHH' }), false);
  });
});

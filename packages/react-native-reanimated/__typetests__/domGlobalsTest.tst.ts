import '..';

import { describe, expect, test } from 'tstyche';

describe('DOM globals', () => {
  test('`navigator.userAgent` and `navigator.vendor` stay read-only', () => {
    expect(() => {
      navigator.userAgent = 'agent';
    }).type.toRaiseError(2540);
    expect(() => {
      navigator.vendor = 'vendor';
    }).type.toRaiseError(2540);
  });
});

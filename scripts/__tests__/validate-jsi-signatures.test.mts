import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { JsiObject } from '../validate-jsi-signatures.mts';
import {
  compareRegistrationsWithTsTypes,
  reportFilesMissingFromJsiObjects,
} from '../validate-jsi-signatures.mts';

const FIXTURES_DIR = path.join(
  import.meta.dirname,
  '__fixtures__',
  'validateJsiSignatures'
);

function proxy(cpp: string): JsiObject {
  return {
    cpp,
    global: '__proxy',
    globals: 'globals.d.ts',
    tsConfig: 'tsconfig.json',
  };
}

describe('validate-jsi-signatures', () => {
  it('passes when the registrations match the TS type', () => {
    assert.deepEqual(
      compareRegistrationsWithTsTypes([proxy('matching.cpp')], FIXTURES_DIR),
      []
    );
  });

  it('reports every mismatch', () => {
    assert.deepEqual(
      compareRegistrationsWithTsTypes([proxy('mismatched.cpp')], FIXTURES_DIR),
      [
        '__proxy.moduleArguments: takes 2 arguments in mismatched.cpp but 1 in globals.d.ts. Make both take the same arguments.',
        '__proxy.noArguments: globals.d.ts declares it, but mismatched.cpp does not register it. Register it in mismatched.cpp or remove the declaration.',
        '__proxy.twoArguments: takes 1 argument in mismatched.cpp but 2 in globals.d.ts. Make both take the same arguments.',
        '__proxy.typedArguments: takes 1 argument in mismatched.cpp but 2 in globals.d.ts. Make both take the same arguments.',
        '__proxy.undeclared: mismatched.cpp registers it, but globals.d.ts does not declare it. Declare it in globals.d.ts or remove the registration.',
      ]
    );
  });

  it('rejects a registration without a literal name', () => {
    assert.throws(
      () =>
        compareRegistrationsWithTsTypes(
          [proxy('unreadable.cpp')],
          FIXTURES_DIR
        ),
      {
        message:
          'scripts/__tests__/__fixtures__/validateJsiSignatures/unreadable.cpp:10: addMethod cannot be read. Pass the method name as a string literal and the implementation as a lambda written in the call.',
      }
    );
  });

  it('reports a file that registers methods but is not listed', () => {
    const sources: Record<string, string> = {
      'listed.cpp':
        'addMethod<0>(rt, obj, "listed", [](jsi::Runtime &, const jsi::Value &) {});',
      'unlisted.cpp':
        'jsi_utils::addMethod<0>(\n    rt, obj, "unlisted", [](jsi::Runtime &, const jsi::Value &) {});',
      'header.h':
        'void addMethod(jsi::Runtime &rt, jsi::Object &obj, const char *name, TFun &&func);',
      'comment.cpp':
        '// addMethod<0>(rt, obj, "commented", [](jsi::Runtime &, const jsi::Value &) {});',
    };
    assert.deepEqual(
      reportFilesMissingFromJsiObjects(
        Object.keys(sources),
        [proxy('listed.cpp')],
        (file) => sources[file]
      ),
      [
        'unlisted.cpp: registers methods with addMethod, but JSI_OBJECTS does not list it. Add it to JSI_OBJECTS in scripts/validate-jsi-signatures.mts.',
      ]
    );
  });
});

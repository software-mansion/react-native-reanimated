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
        '__proxy.objectArguments: argument 1 (array) is `jsi::Function` in C++, but TS allows array. Take `jsi::Array` in C++ or change the TS type.',
        '__proxy.objectArguments: argument 2 (callback) is `jsi::Array` in C++, but TS allows function. Take `jsi::Function` in C++ or change the TS type.',
        '__proxy.objectArguments: argument 4 (value) is `jsi::ArrayBuffer` in C++, but TS allows object. Take `jsi::Object` in C++ or change the TS type.',
        '__proxy.objectArguments: argument 5 (anything) has the C++ type `Custom`, which the linter does not know. Take a type from CPP_KINDS in scripts/validate-jsi-signatures.mts, or add it there with the JS kinds that jsi_utils::get accepts for it.',
        '__proxy.scalarArguments: argument 1 (first) is `bool` in C++, but TS allows number. Take `double` in C++ or change the TS type.',
        '__proxy.scalarArguments: argument 2 (second) is `double` in C++, but TS allows string. Take `std::string` in C++ or change the TS type.',
        '__proxy.scalarArguments: argument 3 (third) is `std::string` in C++, but TS allows boolean. Take `bool` in C++ or change the TS type.',
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
      'listed.cpp': 'addMethod(rt, obj, "listed", [](jsi::Runtime &) {});',
      'unlisted.cpp':
        'jsi_utils::addMethod(\n    rt, obj, "unlisted", [](jsi::Runtime &) {});',
      'header.h':
        'void addMethod(jsi::Runtime &rt, jsi::Object &obj, const char *name, TFun &&func);',
      'comment.cpp':
        '// addMethod(rt, obj, "commented", [](jsi::Runtime &) {});',
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

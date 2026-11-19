import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  type JsiObject,
  unlistedFiles,
  validate,
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
    assert.deepEqual(validate([proxy('matching.cpp')], FIXTURES_DIR), []);
  });

  it('reports every mismatch', () => {
    assert.deepEqual(validate([proxy('mismatched.cpp')], FIXTURES_DIR), [
      '__proxy.debugOnly: registered in every build, so it must not be optional in TS.',
      '__proxy.noArguments: declared in TS but not registered in C++.',
      '__proxy.twoArguments: takes 1 arguments in C++ but 2 in TS.',
      '__proxy.undeclared: registered in C++ but not declared in TS.',
    ]);
  });

  it('refuses a registration without a literal name', () => {
    assert.throws(() => validate([proxy('unreadable.cpp')], FIXTURES_DIR), {
      message:
        'scripts/__tests__/__fixtures__/validateJsiSignatures/unreadable.cpp:10: addMethod needs a number of arguments, a string literal name and a lambda.',
    });
  });

  it('refuses a registration under a condition other than NDEBUG', () => {
    assert.throws(() => validate([proxy('conditional.cpp')], FIXTURES_DIR), {
      message:
        'scripts/__tests__/__fixtures__/validateJsiSignatures/conditional.cpp:10: cannot tell in which builds noArguments is registered.',
    });
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
      unlistedFiles(
        Object.keys(sources),
        [proxy('listed.cpp')],
        (file) => sources[file]
      ),
      [
        'unlisted.cpp registers methods with addMethod but is not listed in JSI_OBJECTS.',
      ]
    );
  });
});

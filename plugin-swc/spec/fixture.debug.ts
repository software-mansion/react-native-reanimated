import * as path from 'path';

const options = {
  filename: path.join(path.resolve(__dirname, '..'), 'jest tests fixture'),
  jsc: {
    parser: {
      syntax: 'ecmascript',
      jsx: true,
    },
    target: 'es2022',
    preserveAllComments: true,
    experimental: {},
  },
  isModule: true,
  module: {
    type: 'commonjs',
  },
};

const transformPresets: Array<
  [
    string,
    (code: string) => ReturnType<typeof import('@swc/core').transformSync>
  ]
> = [
  [
    'custom transform',
    (code: string) => {
      const { transformSync } = require('../index');
      return transformSync(code, true, Buffer.from(JSON.stringify(options)));
    },
  ],
];

describe.each(transformPresets)('fixture with %s', (_, executeTransform) => {
  it('captures worklets environment', () => {
    const input = `
    const x = 5;

    const objX = { x };

    function f() {
      'worklet';
      return { res: x + objX.x };
    }
    `;

    const { code } = executeTransform(input);
    expect(code).toMatchInlineSnapshot(`
      "\\"use strict\\";
      const x = 5;
      const objX = {
          x
      };
      const f = function() {
          const _f = function _f() {
              ;
              return {
                  res: x + objX.x
              };
          };
          _f._closure = {
              x: x,
              objX: {
                  x: objX.x
              }
          };
          _f.asString = \\"function f(){const{x,objX}=jsThis._closure;{;return{res:x+objX.x};}}\\";
          _f.__workletHash = 14970312127675;
          _f.__location = \\"${process.cwd()}/jest tests fixture (6:4)\\";
          return _f;
      }();
      "
    `);
  });
});

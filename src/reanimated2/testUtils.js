import hash from 'string-hash-64';

export function createWorkletMock(fun) {
  var _f = function _f() {
    return fun();
  };

  var funString = fun.toString();

  _f._closure = {};
  _f.asString = funString;
  _f.__workletHash = hash(funString);
  _f.__location = 'jest tests fixture (1:0)';

  global.__reanimatedWorkletInit(_f);

  return _f;
}

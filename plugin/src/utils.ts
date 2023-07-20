export function isRelease() {
  return !!process.env.BABEL_ENV?.match(/(prod|release|stag[ei])/i);
}

export function isRelease() {
  const pattern = /(prod|release|stag[ei])/i;
  return !!(
    process.env.BABEL_ENV?.match(pattern) ||
    process.env.NODE_ENV?.match(pattern)
  );
}

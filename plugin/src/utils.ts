export function isRelease() {
  const regex = /(prod|release|stag[ei]|test)/i;
  return !!(
    process.env.BABEL_ENV?.match(regex) || process.env.NODE_ENV?.match(regex)
  );
}

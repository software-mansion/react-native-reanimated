export function isRelease() {
  return (
    process.env.BABEL_ENV &&
    ['production', 'release'].includes(process.env.BABEL_ENV)
  );
}

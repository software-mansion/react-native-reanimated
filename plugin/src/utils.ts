export function isRelease() {
  return (
    !!process.env.BABEL_ENV &&
    ['prod', 'release', 'stag'].some(
      process.env.BABEL_ENV?.toLowerCase().includes
    )
  );
}

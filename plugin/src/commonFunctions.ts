function hash(str: string): number {
  let i = str.length;
  let hash1 = 5381;
  let hash2 = 52711;

  while (i--) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }

  return (hash1 >>> 0) * 4096 + (hash2 >>> 0);
}
function isRelease() {
  return (
    process.env.BABEL_ENV &&
    ['production', 'release'].includes(process.env.BABEL_ENV)
  );
}

function shouldGenerateSourceMap(): boolean {
  if (isRelease()) {
    return false;
  }

  if (process.env.REANIMATED_PLUGIN_TESTS === 'jest') {
    // We want to detect this, so we can disable source maps (because they break
    // snapshot tests with jest).
    return false;
  }

  return true;
}
export { hash, isRelease, shouldGenerateSourceMap };

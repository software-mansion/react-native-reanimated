export function matchVersion(version1: string, version2: string): boolean {
  if (
    jsVersion.match(/^\d+\.\d+\.\d+$/) &&
    otherVersion.match(/^\d+\.\d+\.\d+$/)
  ) {
    // x.y.z, compare only major and minor, skip patch
    const [major1, minor1] = jsVersion.split('.');
    const [major2, minor2] = otherVersion.split('.');
    return jsMajor === cppMajor && jsMinor === cppMinor;
  } else {
    // alpha, beta or rc, compare everything
    return jsVersion === otherVersion;
  }
}


function matchVersion(jsVersion: string, otherVersion: string): boolean {
  if (
    jsVersion.match(/^\d+\.\d+\.\d+$/) &&
    otherVersion.match(/^\d+\.\d+\.\d+$/)
  ) {
    // x.y.z, compare only major and minor, skip patch
    const [jsMajor, jsMinor] = jsVersion.split('.');
    const [cppMajor, cppMinor] = otherVersion.split('.');
    return jsMajor === cppMajor && jsMinor === cppMinor;
  } else {
    // alpha, beta or rc, compare everything
    return jsVersion === otherVersion;
  }
  // TODO: detect Expo managed workflow
}

export { matchVersion };

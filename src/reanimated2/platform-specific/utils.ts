export function matchVersion(version1: string, version2: string): boolean {
  if (version1.match(/^\d+\.\d+\.\d+$/) && version2.match(/^\d+\.\d+\.\d+$/)) {
    // x.y.z, compare only major and minor, skip patch
    const [major1, minor1] = version1.split('.');
    const [major2, minor2] = version2.split('.');
    return major1 === major2 && minor1 === minor2;
  } else {
    // alpha, beta or rc, compare everything
    return version1 === version2;
  }
}

/** @typedef {{ name: string; skipByDefault?: boolean; disabled?: boolean }} DeclaredSuite */

/**
 * @param {DeclaredSuite[]} suites
 * @param {string[] | null} only
 * @returns {string[]}
 */
function selectSuites(suites, only) {
  return suites
    .filter((suite) =>
      only ? only.includes(suite.name) : !suite.skipByDefault && !suite.disabled
    )
    .map((suite) => suite.name);
}

/**
 * @param {string[]} selectedSuites
 * @param {string | null} lastResumeSuite
 * @param {string} requestedSuite
 * @returns {boolean}
 */
function reloadRepeatsSuites(selectedSuites, lastResumeSuite, requestedSuite) {
  if (lastResumeSuite === null) {
    return false;
  }
  const requestedIndex = selectedSuites.indexOf(requestedSuite);
  const lastResumeIndex = selectedSuites.indexOf(lastResumeSuite);
  if (requestedIndex === -1 || lastResumeIndex === -1) {
    return false;
  }
  return requestedIndex <= lastResumeIndex;
}

module.exports = {
  selectSuites,
  reloadRepeatsSuites,
};

import type { DeclaredSuite } from '../../common-app/runtime-tests/ReJest/utils/remoteProtocol.ts';

type SuiteDeclaration = Pick<DeclaredSuite, 'name'> &
  Partial<Omit<DeclaredSuite, 'name'>>;

export function selectSuites(
  suites: SuiteDeclaration[],
  only: string[] | null
): string[] {
  return suites
    .filter((suite) =>
      only ? only.includes(suite.name) : !suite.skipByDefault && !suite.disabled
    )
    .map((suite) => suite.name);
}

export function reloadRepeatsSuites(
  selectedSuites: string[],
  lastResumeSuite: string | null,
  requestedSuite: string
): boolean {
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

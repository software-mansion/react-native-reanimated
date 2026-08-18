import path from 'node:path';
import { parseArgs } from 'node:util';
import ts from 'typescript';

const USAGE =
  'Usage: node --experimental-strip-types validate-mock.mts --source <exports-file> --mock <mock-file> --tsConfig <tsconfig-file>';

function main(): void {
  let source: string | undefined;
  let mock: string | undefined;
  let tsConfig: string | undefined;
  try {
    ({
      values: { source, mock, tsConfig },
    } = parseArgs({
      options: {
        source: { type: 'string' },
        mock: { type: 'string' },
        tsConfig: { type: 'string' },
      },
    }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  if (!source || !mock || !tsConfig) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  const sourcePath = path.resolve(source);
  const mockPath = path.resolve(mock);
  const tsConfigPath = path.resolve(tsConfig);

  const program = createProgram([sourcePath, mockPath], tsConfigPath);
  const checker = program.getTypeChecker();
  const valueExports = collectValueExports(program, checker, sourcePath);
  const mockProperties = new Set(
    collectMockProperties(program, checker, mockPath)
  );

  const missingInMock = valueExports
    .filter((name) => !mockProperties.has(name))
    .sort();
  const extraInMock = [...mockProperties]
    .filter((name) => !valueExports.includes(name))
    .sort();

  if (missingInMock.length > 0) {
    console.log(
      `Exports of ${source} missing in ${mock} (${missingInMock.length}):`
    );
    for (const name of missingInMock) {
      console.log(`  - ${name}`);
    }
  } else {
    console.log(`All value exports of ${source} are present in ${mock}.`);
  }
  if (extraInMock.length > 0) {
    console.log(
      `Present in ${mock} but not exported from ${source} (${extraInMock.length}):`
    );
    for (const name of extraInMock) {
      console.log(`  - ${name}`);
    }
  }

  process.exitCode = missingInMock.length > 0 || extraInMock.length > 0 ? 1 : 0;
}

function createProgram(rootFiles: string[], tsConfigPath: string): ts.Program {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    tsConfigPath,
    { noEmit: true },
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        );
      },
    }
  );
  if (!parsed) {
    throw new Error(`Could not parse ${tsConfigPath}`);
  }
  if (parsed.errors.length > 0) {
    throw new Error(
      `Errors in ${tsConfigPath}:\n${ts.formatDiagnostics(parsed.errors, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine,
      })}`
    );
  }
  return ts.createProgram(rootFiles, parsed.options);
}

function collectValueExports(
  program: ts.Program,
  checker: ts.TypeChecker,
  filePath: string
): string[] {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    throw new Error(`Could not load ${filePath}`);
  }
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) {
    throw new Error(`Could not resolve the module symbol of ${filePath}`);
  }
  const names: string[] = [];
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    if (isTypeOnlyExport(symbol)) {
      continue;
    }
    const resolved =
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
    if (resolved.flags & ts.SymbolFlags.Value) {
      names.push(symbol.name);
    }
  }
  return names;
}

function isTypeOnlyExport(symbol: ts.Symbol): boolean {
  const declaration = symbol.declarations?.[0];
  if (!declaration || !ts.isExportSpecifier(declaration)) {
    return false;
  }
  return declaration.isTypeOnly || declaration.parent.parent.isTypeOnly;
}

function collectMockProperties(
  program: ts.Program,
  checker: ts.TypeChecker,
  filePath: string
): string[] {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    throw new Error(`Could not load ${filePath}`);
  }
  for (const statement of sourceFile.statements) {
    if (
      ts.isExpressionStatement(statement) &&
      ts.isBinaryExpression(statement.expression) &&
      statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      statement.expression.left.getText(sourceFile) === 'module.exports'
    ) {
      return checker
        .getTypeAtLocation(statement.expression.right)
        .getProperties()
        .map((property) => property.name)
        .filter((name) => name !== '__esModule');
    }
  }
  throw new Error(`Could not find \`module.exports = ...\` in ${filePath}`);
}

main();

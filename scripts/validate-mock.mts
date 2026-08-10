import path from 'node:path';
import ts from 'typescript';

function main(): void {
  const [exportsArg, mockArg] = process.argv.slice(2);
  if (!exportsArg || !mockArg) {
    console.error(
      'Usage: node --experimental-strip-types validate-mock.mts <exports-file> <mock-file>'
    );
    process.exitCode = 1;
    return;
  }
  const exportsPath = path.resolve(exportsArg);
  const mockPath = path.resolve(mockArg);

  const program = createProgram([exportsPath, mockPath]);
  const checker = program.getTypeChecker();
  const valueExports = collectValueExports(program, checker, exportsPath);
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
      `Exports of ${exportsArg} missing in ${mockArg} (${missingInMock.length}):`
    );
    for (const name of missingInMock) {
      console.log(`  - ${name}`);
    }
  } else {
    console.log(
      `All value exports of ${exportsArg} are present in ${mockArg}.`
    );
  }
  if (extraInMock.length > 0) {
    console.log(
      `Present in ${mockArg} but not exported from ${exportsArg} (${extraInMock.length}):`
    );
    for (const name of extraInMock) {
      console.log(`  - ${name}`);
    }
  }

  process.exitCode =
    missingInMock.length > 0 || extraInMock.length > 0 ? 1 : 0;
}

function createProgram(rootFiles: string[]): ts.Program {
  const configPath = path.resolve('tsconfig.native.json');
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
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
    throw new Error(`Could not parse ${configPath}`);
  }
  if (parsed.errors.length > 0) {
    throw new Error(
      `Errors in ${configPath}:\n${ts.formatDiagnostics(parsed.errors, {
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

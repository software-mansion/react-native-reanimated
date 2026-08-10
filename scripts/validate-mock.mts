import path from 'node:path';
import ts from 'typescript';

const packageDir = process.cwd();
const indexPath = path.join(packageDir, 'src', 'index.ts');
const mockPath = path.join(packageDir, 'src', 'mock.ts');

function main(): void {
  const program = createProgram();
  const checker = program.getTypeChecker();
  const indexExports = collectIndexValueExports(program, checker);
  const mockProperties = new Set(collectMockProperties(program, checker));

  const missingInMock = indexExports
    .filter((name) => !mockProperties.has(name))
    .sort();
  const extraInMock = [...mockProperties]
    .filter((name) => !indexExports.includes(name))
    .sort();

  if (missingInMock.length > 0) {
    console.log(
      `Exports of src/index.ts missing in src/mock.ts (${missingInMock.length}):`
    );
    for (const name of missingInMock) {
      console.log(`  - ${name}`);
    }
  } else {
    console.log(
      'All value exports of src/index.ts are present in src/mock.ts.'
    );
  }
  if (extraInMock.length > 0) {
    console.log(
      `Present in src/mock.ts but not exported from src/index.ts (${extraInMock.length}, informational):`
    );
    for (const name of extraInMock) {
      console.log(`  - ${name}`);
    }
  }

  process.exitCode = missingInMock.length > 0 ? 1 : 0;
}

function createProgram(): ts.Program {
  const configPath = path.join(packageDir, 'tsconfig.native.json');
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
    throw new Error('Could not parse tsconfig.native.json');
  }
  if (parsed.errors.length > 0) {
    throw new Error(
      `Errors in tsconfig.native.json:\n${ts.formatDiagnostics(parsed.errors, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine,
      })}`
    );
  }
  return ts.createProgram([indexPath, mockPath], parsed.options);
}

function collectIndexValueExports(
  program: ts.Program,
  checker: ts.TypeChecker
): string[] {
  const sourceFile = program.getSourceFile(indexPath);
  if (!sourceFile) {
    throw new Error('Could not load src/index.ts');
  }
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) {
    throw new Error('Could not resolve the module symbol of src/index.ts');
  }
  const names: string[] = [];
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
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

function collectMockProperties(
  program: ts.Program,
  checker: ts.TypeChecker
): string[] {
  const sourceFile = program.getSourceFile(mockPath);
  if (!sourceFile) {
    throw new Error('Could not load src/mock.ts');
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
  throw new Error('Could not find `module.exports = ...` in src/mock.ts');
}

main();

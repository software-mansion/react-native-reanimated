import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export type JsiObject = {
  cpp: string;
  global: string;
  globals: string;
  tsConfig: string;
};

const REPO = path.resolve(import.meta.dirname, '..');

export const JSI_OBJECTS: JsiObject[] = [
  {
    cpp: 'packages/react-native-worklets/Common/cpp/worklets/NativeModules/JSIWorkletsModuleProxy.cpp',
    global: '__workletsModuleProxy',
    globals: 'packages/react-native-worklets/src/privateGlobals.d.ts',
    tsConfig: 'packages/react-native-worklets/tsconfig.native.json',
  },
  {
    cpp: 'packages/react-native-worklets/Common/cpp/worklets/Networking/NetworkingInstaller.cpp',
    global: '__workletsNetworking',
    globals: 'packages/react-native-worklets/src/privateGlobals.d.ts',
    tsConfig: 'packages/react-native-worklets/tsconfig.native.json',
  },
  {
    cpp: 'packages/react-native-reanimated/Common/cpp/reanimated/NativeModules/ReanimatedModuleProxy.cpp',
    global: '__reanimatedModuleProxy',
    globals: 'packages/react-native-reanimated/src/privateGlobals.d.ts',
    tsConfig: 'packages/react-native-reanimated/tsconfig.native.json',
  },
];

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const REGISTRATION =
  /\baddMethod\b\s*(?:<[^<>]*>)?\s*\(\s*[^,()]+,\s*[^,()]+,\s*"/;

type Build = 'debug' | 'release';

type Registration = { builds: Build[]; length: number };

type TsMethod = {
  parameters: number;
  optional: boolean;
  unsupported?: string;
};

function main(): void {
  try {
    const files = execFileSync(
      'git',
      [
        'grep',
        '-l',
        'addMethod',
        '--',
        '*.cpp',
        '*.mm',
        '*.h',
        '*.hpp',
        ':!scripts/__tests__/__fixtures__',
      ],
      { cwd: REPO, encoding: 'utf8' }
    )
      .split('\n')
      .filter(Boolean);
    const problems = [
      ...unlistedFiles(files, JSI_OBJECTS, (file) =>
        fs.readFileSync(path.join(REPO, file), 'utf8')
      ),
      ...validate(JSI_OBJECTS, REPO),
    ];
    if (problems.length === 0) {
      console.log(
        `The methods of ${JSI_OBJECTS.map(({ global }) => global).join(', ')} match their TS types.`
      );
      return;
    }
    console.log(
      `JSI methods do not match their TS types (${problems.length}):`
    );
    for (const problem of problems) {
      console.log(`  - ${problem}`);
    }
    process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

export function unlistedFiles(
  files: string[],
  jsiObjects: JsiObject[],
  read: (file: string) => string
): string[] {
  const listed = new Set(jsiObjects.map(({ cpp }) => cpp));
  return files
    .filter(
      (file) =>
        !listed.has(file) && REGISTRATION.test(withoutComments(read(file)))
    )
    .map(
      (file) =>
        `${file} registers methods with addMethod but is not listed in JSI_OBJECTS.`
    );
}

export function validate(jsiObjects: JsiObject[], root: string): string[] {
  return jsiObjects.flatMap(({ cpp, global, globals, tsConfig }) =>
    findProblems(
      global,
      readRegistrations(path.join(root, cpp)),
      readTsMethods(global, path.join(root, globals), path.join(root, tsConfig))
    )
  );
}

function readRegistrations(cpp: string): Map<string, Registration[]> {
  const source = withoutComments(fs.readFileSync(cpp, 'utf8'));
  const fail = (offset: number, message: string): never => {
    const line = source.slice(0, offset).split('\n').length;
    throw new Error(`${path.relative(REPO, cpp)}:${line}: ${message}`);
  };
  const registrations = new Map<string, Registration[]>();
  for (const { index } of source.matchAll(/\baddMethod\b/g)) {
    const call = /^\s*(?:<\s*(\d+)\s*>\s*)?([(;])/.exec(
      source.slice(index + 'addMethod'.length)
    );
    if (call?.[2] === ';') {
      continue;
    }
    const open = index + 'addMethod'.length + (call?.[0].length ?? 0) - 1;
    const args = call
      ? splitTopLevel(source.slice(open + 1, closing(source, open)))
      : [];
    const name = /^"(\w+)"$/.exec(args[2] ?? '')?.[1];
    if (!call?.[1] || args.length !== 4 || !name) {
      fail(
        index,
        'addMethod needs a number of arguments, a string literal name and a lambda.'
      );
    }
    const builds = buildsAt(source, index);
    if (!builds) {
      fail(index, `cannot tell in which builds ${name} is registered.`);
    }
    registrations.set(name!, [
      ...(registrations.get(name!) ?? []),
      { builds: builds!, length: Number(call![1]) },
    ]);
  }
  return registrations;
}

function buildsAt(source: string, offset: number): Build[] | undefined {
  let builds: Build[] = ['debug', 'release'];
  const stack: (Build[] | undefined)[] = [];
  for (const [, directive, condition] of source
    .slice(0, offset)
    .matchAll(/^\s*#\s*(ifndef|ifdef|if|elif|else|endif)\b(.*)$/gm)) {
    if (directive === 'endif') {
      stack.pop();
    } else if (directive === 'else') {
      const last = stack.pop();
      stack.push(
        last?.length === 1
          ? [last[0] === 'debug' ? 'release' : 'debug']
          : undefined
      );
    } else if (directive === 'elif') {
      stack.pop();
      stack.push(undefined);
    } else if (condition.trim() === 'NDEBUG' && directive !== 'if') {
      stack.push([directive === 'ifndef' ? 'debug' : 'release']);
    } else {
      stack.push(undefined);
    }
  }
  for (const condition of stack) {
    if (!condition) {
      return undefined;
    }
    builds = builds.filter((build) => condition.includes(build));
  }
  return builds;
}

function withoutComments(source: string): string {
  return source.replace(
    /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (match) => (match[0] === '/' ? match.replace(/[^\n]/g, ' ') : match)
  );
}

function closing(text: string, open: number): number {
  const expected: string[] = [];
  for (let index = open; index < text.length; index++) {
    const char = text[index];
    if (char === '"' || char === "'") {
      index = endOfLiteral(text, index);
    } else if (PAIRS[char]) {
      expected.push(PAIRS[char]);
    } else if (char === expected.at(-1)) {
      expected.pop();
      if (expected.length === 0) {
        return index;
      }
    }
  }
  throw new Error(`Unbalanced brackets at \`${text.slice(open, open + 40)}\`.`);
}

function splitTopLevel(list: string, brackets = '()[]{}'): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < list.length; index++) {
    const char = list[index];
    const bracket = brackets.indexOf(char);
    if (char === '"' || char === "'") {
      index = endOfLiteral(list, index);
    } else if (bracket !== -1) {
      depth += bracket % 2 === 0 ? 1 : -1;
    } else if (char === ',' && depth === 0) {
      parts.push(list.slice(start, index).trim());
      start = index + 1;
    }
  }
  const last = list.slice(start).trim();
  return last ? [...parts, last] : parts;
}

function endOfLiteral(text: string, open: number): number {
  let index = open + 1;
  while (index < text.length && text[index] !== text[open]) {
    index += text[index] === '\\' ? 2 : 1;
  }
  return index;
}

function readTsMethods(
  global: string,
  globals: string,
  tsConfig: string
): Map<string, TsMethod> {
  const { options } = ts.getParsedCommandLineOfConfigFile(
    tsConfig,
    { noEmit: true },
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        );
      },
    }
  )!;
  const program = ts.createProgram([globals], options);
  const unresolved = program
    .getSemanticDiagnostics()
    .find(({ code }) => code === 2307 || code === 2792);
  if (unresolved) {
    throw new Error(
      `TypeScript cannot resolve the types of ${global}: ${ts.flattenDiagnosticMessageText(unresolved.messageText, ' ')} Run \`yarn build-packages\` and try again.`
    );
  }
  const checker = program.getTypeChecker();
  const declaration = findVariable(program.getSourceFile(globals), global);
  if (!declaration) {
    throw new Error(
      `Could not find the declaration of ${global} in ${path.relative(REPO, globals)}.`
    );
  }

  const methods = new Map<string, TsMethod>();
  const type = checker.getTypeAtLocation(declaration).getNonNullableType();
  for (const member of type.getProperties()) {
    const signatures = checker
      .getTypeOfSymbolAtLocation(member, declaration)
      .getNonNullableType()
      .getCallSignatures();
    const parameters = signatures[0]?.parameters ?? [];
    const hasRestParameter = parameters.some(
      ({ valueDeclaration }) =>
        valueDeclaration &&
        ts.isParameter(valueDeclaration) &&
        valueDeclaration.dotDotDotToken
    );
    methods.set(member.name, {
      parameters: parameters.length,
      optional: (member.flags & ts.SymbolFlags.Optional) !== 0,
      unsupported:
        signatures.length !== 1
          ? 'must have exactly one call signature'
          : hasRestParameter
            ? 'must not have a rest parameter'
            : undefined,
    });
  }
  return methods;
}

function findVariable(
  node: ts.Node | undefined,
  name: string
): ts.VariableDeclaration | undefined {
  if (!node) {
    return undefined;
  }
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === name
  ) {
    return node;
  }
  return ts.forEachChild(node, (child) => findVariable(child, name));
}

function findProblems(
  global: string,
  registrations: Map<string, Registration[]>,
  tsMethods: Map<string, TsMethod>
): string[] {
  const problems: string[] = [];
  const names = new Set([...registrations.keys(), ...tsMethods.keys()]);
  for (const name of [...names].sort()) {
    const report = (message: string) =>
      problems.push(`${global}.${name}: ${message}`);
    const registered = registrations.get(name) ?? [];
    const builds = registered.flatMap(({ builds }) => builds);
    const inEveryBuild = builds.includes('debug') && builds.includes('release');
    const tsMethod = tsMethods.get(name);

    if (builds.length !== new Set(builds).size) {
      report('registered more than once in C++.');
    }
    if (!tsMethod) {
      report('registered in C++ but not declared in TS.');
    } else if (tsMethod.unsupported) {
      report(`the TS declaration ${tsMethod.unsupported}.`);
    } else if (registered.length === 0) {
      report('declared in TS but not registered in C++.');
    } else {
      const lengths = new Set(registered.map(({ length }) => length));
      if ([...lengths].some((length) => length !== tsMethod.parameters)) {
        report(
          `takes ${[...lengths].join(' or ')} arguments in C++ but ${tsMethod.parameters} in TS.`
        );
      }
      if (inEveryBuild && tsMethod.optional) {
        report('registered in every build, so it must not be optional in TS.');
      } else if (!inEveryBuild && !tsMethod.optional) {
        report(
          `registered only in ${builds.includes('debug') ? 'debug' : 'release'} builds, so it must be optional in TS.`
        );
      }
    }
  }
  return problems;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main();
}

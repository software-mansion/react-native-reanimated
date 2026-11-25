import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import {
  findCalls,
  findClosingBracket,
  splitTopLevel,
} from './cpp-scanner.mts';

export type JsiObject = {
  cpp: string;
  global: string;
  globals: string;
  tsConfig: string;
};

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '..');

const JSI_OBJECTS: JsiObject[] = [
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

const SCRIPT = path.relative(REPOSITORY_ROOT, import.meta.filename);

const OBJECT_KINDS = ['object', 'array', 'function', 'arrayBuffer'] as const;

type Kind =
  | (typeof OBJECT_KINDS)[number]
  | 'number'
  | 'boolean'
  | 'string'
  | 'bigint'
  | 'undefined'
  | 'null';

const CPP_KINDS: Record<string, readonly Kind[]> = {
  double: ['number'],
  int: ['number'],
  Tag: ['number'],
  'RuntimeData::RuntimeId': ['number'],
  bool: ['boolean'],
  'std::string': ['string'],
  'jsi::String': ['string'],
  'std::optional<std::string>': ['string', 'undefined'],
  'jsi::BigInt': ['bigint'],
  'jsi::Array': ['array'],
  'jsi::Function': ['function'],
  'jsi::ArrayBuffer': ['arrayBuffer'],
  'jsi::Object': OBJECT_KINDS,
};

type Registration = { parameters: string[] };

type TsParameter = { name: string; kinds: Kind[] | undefined };

type TsMethod = {
  parameters: TsParameter[];
  declarationProblem?: string;
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
      { cwd: REPOSITORY_ROOT, encoding: 'utf8' }
    )
      .split('\n')
      .filter(Boolean);
    const problems = [
      ...reportFilesMissingFromJsiObjects(files, JSI_OBJECTS, (file) =>
        fs.readFileSync(path.join(REPOSITORY_ROOT, file), 'utf8')
      ),
      ...compareRegistrationsWithTsTypes(JSI_OBJECTS, REPOSITORY_ROOT),
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
    process.exitCode = 1;
  }
}

export function reportFilesMissingFromJsiObjects(
  files: string[],
  jsiObjects: JsiObject[],
  read: (file: string) => string
): string[] {
  const listed = new Set(jsiObjects.map(({ cpp }) => cpp));
  return files
    .filter((file) => {
      if (listed.has(file)) {
        return false;
      }
      return readAddMethodCalls(read(file)).some(
        ({ name }) => name !== undefined
      );
    })
    .map(
      (file) =>
        `${file}: registers methods with addMethod, but JSI_OBJECTS does not list it. Add it to JSI_OBJECTS in ${SCRIPT}.`
    );
}

export function compareRegistrationsWithTsTypes(
  jsiObjects: JsiObject[],
  rootDir: string
): string[] {
  return jsiObjects.flatMap((jsiObject) =>
    findProblems(
      jsiObject,
      readRegisteredMethods(path.join(rootDir, jsiObject.cpp)),
      readTsMethods(
        jsiObject.global,
        path.join(rootDir, jsiObject.globals),
        path.join(rootDir, jsiObject.tsConfig)
      )
    )
  );
}

function readRegisteredMethods(
  cppFilePath: string
): Map<string, Registration[]> {
  const source = fs.readFileSync(cppFilePath, 'utf8');
  const fail = (offset: number, message: string): never => {
    const line = source.slice(0, offset).split('\n').length;
    throw new Error(
      `${path.relative(REPOSITORY_ROOT, cppFilePath)}:${line}: ${message}`
    );
  };
  const registrations = new Map<string, Registration[]>();
  for (const { index, name, parameters } of readAddMethodCalls(source)) {
    if (!name || !parameters) {
      fail(
        index,
        'addMethod cannot be read. Pass the method name as a string literal and the implementation as a lambda written in the call.'
      );
    }
    registrations.set(name!, [
      ...(registrations.get(name!) ?? []),
      { parameters: parameters!.map(cppType) },
    ]);
  }
  return registrations;
}

function readAddMethodCalls(
  source: string
): { index: number; name?: string; parameters?: string[] }[] {
  return findCalls(source, 'addMethod').flatMap((index) => {
    const call = /^\s*([(;])/.exec(source.slice(index + 'addMethod'.length));
    if (call?.[1] === ';') {
      return [];
    }
    const args = call
      ? splitTopLevel(source, index + 'addMethod'.length + call[0].length - 1)
      : [];
    return [
      {
        index,
        name: /^"(\w+)"$/.exec(args[2] ?? '')?.[1],
        parameters: readParameters(args),
      },
    ];
  });
}

function readParameters(args: string[]): string[] | undefined {
  if (args.length !== 4 && args.length !== 5) {
    return undefined;
  }
  const parameters = lambdaParameters(args.at(-1)!);
  const native = args.length === 5 ? 2 : 1;
  return parameters && parameters.length >= native
    ? parameters.slice(native)
    : undefined;
}

function cppType(parameter: string): string {
  return parameter
    .replace(/\[\[[^\]]*\]\]/g, ' ')
    .replace(/\bconst\b|[&*]/g, ' ')
    .trim()
    .replace(/\s+[A-Za-z_]\w*$/, '')
    .replace(/\s+/g, ' ');
}

function lambdaParameters(lambda: string): string[] | undefined {
  if (!lambda.startsWith('[')) {
    return undefined;
  }
  const open = lambda.indexOf('(', findClosingBracket(lambda, 0));
  return open === -1 ? undefined : splitTopLevel(lambda, open, '([{<');
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
      `${path.relative(REPOSITORY_ROOT, globals)} does not declare ${global}. Declare it there or fix its entry in JSI_OBJECTS in ${SCRIPT}.`
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
      parameters: parameters.map((parameter) => ({
        name: parameter.name,
        kinds: tsKinds(
          checker,
          checker.getTypeOfSymbolAtLocation(parameter, declaration)
        ),
      })),
      declarationProblem:
        signatures.length !== 1
          ? `has ${signatures.length} call signatures. Declare exactly one.`
          : hasRestParameter
            ? 'has a rest parameter. Declare each parameter separately.'
            : undefined,
    });
  }
  return methods;
}

function tsKinds(checker: ts.TypeChecker, type: ts.Type): Kind[] | undefined {
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
    return undefined;
  }
  if (type.isUnion()) {
    const kinds = type.types.map((member) => tsKinds(checker, member));
    return kinds.every(Boolean)
      ? [...new Set(kinds.flatMap((member) => member!))]
      : undefined;
  }
  if (type.isIntersection()) {
    const kinds = type.types.flatMap((part) => tsKinds(checker, part) ?? []);
    const specific = kinds.find((kind) => kind !== 'object');
    return specific ? [specific] : kinds.length ? ['object'] : undefined;
  }
  if (type.flags & ts.TypeFlags.Instantiable) {
    const constraint = checker.getBaseConstraintOfType(type);
    return constraint && constraint !== type
      ? tsKinds(checker, constraint)
      : undefined;
  }
  if (type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) {
    return ['undefined'];
  }
  if (type.flags & ts.TypeFlags.Null) {
    return ['null'];
  }
  if (type.flags & ts.TypeFlags.NumberLike) {
    return ['number'];
  }
  if (type.flags & ts.TypeFlags.BooleanLike) {
    return ['boolean'];
  }
  if (type.flags & ts.TypeFlags.StringLike) {
    return ['string'];
  }
  if (type.flags & ts.TypeFlags.BigIntLike) {
    return ['bigint'];
  }
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return ['array'];
  }
  if (
    type.getCallSignatures().length > 0 ||
    type.getSymbol()?.name === 'RemoteFunction'
  ) {
    return ['function'];
  }
  if (type.getSymbol()?.name === 'ArrayBuffer') {
    return ['arrayBuffer'];
  }
  return type.flags & (ts.TypeFlags.Object | ts.TypeFlags.NonPrimitive)
    ? ['object']
    : undefined;
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
  { cpp, global, globals }: JsiObject,
  registrations: Map<string, Registration[]>,
  tsMethods: Map<string, TsMethod>
): string[] {
  const problems: string[] = [];
  const names = new Set([...registrations.keys(), ...tsMethods.keys()]);
  for (const name of [...names].sort()) {
    const report = (message: string) =>
      problems.push(`${global}.${name}: ${message}`);
    // The scanner ignores the preprocessor, so a method registered in both
    // branches of an `#ifndef NDEBUG` shows up twice. Only registrations that
    // disagree are a problem.
    const registered = [
      ...new Map(
        (registrations.get(name) ?? []).map((registration) => [
          registration.parameters.join(', '),
          registration,
        ])
      ).values(),
    ];
    const tsMethod = tsMethods.get(name);

    if (registered.length > 1) {
      report(
        `${cpp} registers it more than once with different arguments. Register it with the same arguments each time.`
      );
    }
    if (!tsMethod) {
      report(
        `${cpp} registers it, but ${globals} does not declare it. Declare it in ${globals} or remove the registration.`
      );
    } else if (tsMethod.declarationProblem) {
      report(`the declaration in ${globals} ${tsMethod.declarationProblem}`);
    } else if (registered.length === 0) {
      report(
        `${globals} declares it, but ${cpp} does not register it. Register it in ${cpp} or remove the declaration.`
      );
    } else {
      const lengths = [
        ...new Set(registered.map(({ parameters }) => parameters.length)),
      ];
      const tsLength = tsMethod.parameters.length;
      if (lengths.some((length) => length !== tsLength)) {
        report(
          `takes ${lengths.join(' or ')} ${lengths.at(-1) === 1 ? 'argument' : 'arguments'} in ${cpp} but ${tsLength} in ${globals}. Make both take the same arguments.`
        );
      } else {
        for (const { parameters } of registered) {
          parameters.forEach((type, index) => {
            const problem = typeProblem(type, tsMethod.parameters[index]);
            if (problem) {
              report(`argument ${index + 1} ${problem}`);
            }
          });
        }
      }
    }
  }
  return problems;
}

function typeProblem(
  type: string,
  { name, kinds }: TsParameter
): string | undefined {
  if (type === 'jsi::Value') {
    return undefined;
  }
  const accepted = CPP_KINDS[type];
  if (!accepted) {
    return `(${name}) has the C++ type \`${type}\`, which the linter does not know. Take a type from CPP_KINDS in ${SCRIPT}, or add it there with the JS kinds that jsi_utils::get accepts for it.`;
  }
  const rejected = kinds?.filter((kind) => !accepted.includes(kind)) ?? [];
  if (rejected.length === 0) {
    return undefined;
  }
  const suggested =
    Object.keys(CPP_KINDS).find((candidate) =>
      kinds!.every((kind) => CPP_KINDS[candidate].includes(kind))
    ) ?? 'jsi::Value';
  return `(${name}) is \`${type}\` in C++, but TS allows ${rejected.join(' | ')}. Take \`${suggested}\` in C++ or change the TS type.`;
}

if (import.meta.filename === process.argv[1]) {
  main();
}

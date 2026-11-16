import type { PackageSource, VariantKey, VariantsConfig } from './config.mts';
import type { BuiltVariant } from './variant-build.mts';

export interface Difference {
  field: string;
  a: string;
  b: string;
}

export function variantDifferences(
  config: VariantsConfig,
  variants: Partial<Record<VariantKey, BuiltVariant>>
): Difference[] {
  const { a, b } = config;
  const rows: Difference[] = [
    {
      field: 'reanimated source',
      a: describeSource(a.reanimated),
      b: describeSource(b.reanimated),
    },
    {
      field: 'worklets source',
      a: describeSource(a.worklets),
      b: describeSource(b.worklets),
    },
    {
      field: 'reanimated version',
      a: variants.a?.installedVersions.reanimated ?? '-',
      b: variants.b?.installedVersions.reanimated ?? '-',
    },
    {
      field: 'worklets version',
      a: variants.a?.installedVersions.worklets ?? '-',
      b: variants.b?.installedVersions.worklets ?? '-',
    },
    {
      field: 'yarn.lock SHA-256',
      a: variants.a?.lockfileSha256 ?? '-',
      b: variants.b?.lockfileSha256 ?? '-',
    },
    {
      field: 'app build',
      a: variants.a?.appBuild ?? '-',
      b: variants.b?.appBuild ?? '-',
    },
    ...flagDifferences(
      'reanimated',
      variants.a?.effectiveFlags.reanimated ?? {},
      variants.b?.effectiveFlags.reanimated ?? {}
    ),
    ...flagDifferences(
      'worklets',
      variants.a?.effectiveFlags.worklets ?? {},
      variants.b?.effectiveFlags.worklets ?? {}
    ),
    { field: 'bundleMode', a: String(a.bundleMode), b: String(b.bundleMode) },
    { field: 'profiling', a: String(a.profiling), b: String(b.profiling) },
  ];
  return rows.filter((row) => row.a !== row.b);
}

function describeSource(source: PackageSource): string {
  return source.kind === 'npm' ? source.version : source.path;
}

function flagDifferences(
  library: string,
  a: Record<string, boolean>,
  b: Record<string, boolean>
): Difference[] {
  const names = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return names.map((name) => ({
    field: `${library} ${name}`,
    a: String(a[name] ?? '-'),
    b: String(b[name] ?? '-'),
  }));
}

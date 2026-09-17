export type Builder = 'cargo' | 'zigbuild' | 'xwin';

export interface Target {
  platform: NodeJS.Platform;
  arch: string;
  /** How build-all.mts cross-compiles this target from macOS. */
  builder: Builder;
}

/** Every target shipped in the npm package, keyed by Rust target triple. */
export const TARGETS: Record<string, Target> = {
  'aarch64-apple-darwin': {
    platform: 'darwin',
    arch: 'arm64',
    builder: 'cargo',
  },
  'x86_64-apple-darwin': { platform: 'darwin', arch: 'x64', builder: 'cargo' },
  'aarch64-unknown-linux-gnu': {
    platform: 'linux',
    arch: 'arm64',
    builder: 'zigbuild',
  },
  'x86_64-unknown-linux-gnu': {
    platform: 'linux',
    arch: 'x64',
    builder: 'zigbuild',
  },
  'aarch64-pc-windows-msvc': {
    platform: 'win32',
    arch: 'arm64',
    builder: 'xwin',
  },
  'x86_64-pc-windows-msvc': { platform: 'win32', arch: 'x64', builder: 'xwin' },
};

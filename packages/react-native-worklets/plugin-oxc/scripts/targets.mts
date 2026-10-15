export const TARGETS: Record<
  string,
  { platform: NodeJS.Platform; arch: string }
> = {
  'aarch64-apple-darwin': { platform: 'darwin', arch: 'arm64' },
  'x86_64-apple-darwin': { platform: 'darwin', arch: 'x64' },
  'aarch64-unknown-linux-gnu': { platform: 'linux', arch: 'arm64' },
  'x86_64-unknown-linux-gnu': { platform: 'linux', arch: 'x64' },
  'aarch64-pc-windows-msvc': { platform: 'win32', arch: 'arm64' },
  'x86_64-pc-windows-msvc': { platform: 'win32', arch: 'x64' },
};

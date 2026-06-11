/**
 * Minimal Node typings for the integration suite.
 *
 * tsconfig.json pins `types` to ["jest"], so @types/node's ambient module
 * declarations are not loaded project-wide — on purpose: the app targets
 * React Native and must not see Node globals. The integration tests run
 * under Node (jest.integration.config.js -> testEnvironment: 'node') and
 * only need execSync; declare just that instead of widening the app's
 * global type surface. Delete this file if `node` is ever added to
 * tsconfig `types`.
 */
declare module 'node:child_process' {
  export interface ExecSyncOptions {
    encoding: 'utf8';
    stdio?: readonly ['ignore', 'pipe', 'ignore'];
  }
  export function execSync(command: string, options: ExecSyncOptions): string;
}

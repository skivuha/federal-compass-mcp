import createDebug from 'debug';

const NAMESPACE = 'federal-compass';

export function createLogger(scope: string): createDebug.Debugger {
  return createDebug(`${NAMESPACE}:${scope}`);
}

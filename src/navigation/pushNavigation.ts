export type PushNavigationAction =
  | { kind: 'chat'; atendimentoId: number }
  | { kind: 'renovacao'; atendimentoId: number; documentoUrl?: string | null };

type Handler = (action: PushNavigationAction) => void;

let handler: Handler | null = null;
let pending: PushNavigationAction | null = null;

export function setPushNavigationHandler(next: Handler | null) {
  handler = next;
  if (handler && pending) {
    const action = pending;
    pending = null;
    requestAnimationFrame(() => handler?.(action));
  }
}

export function emitPushNavigation(action: PushNavigationAction) {
  if (handler) handler(action);
  else pending = action;
}

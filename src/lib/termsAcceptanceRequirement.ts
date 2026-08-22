export const TERMS_ACCEPTANCE_REQUIRED_ERROR_CODE = "TERMS_ACCEPTANCE_REQUIRED";
export const TERMS_ACCEPTANCE_REQUIRED_FALLBACK_MESSAGE =
  "You must accept the current Terms of Use before using this service.";

type TermsAcceptanceRequiredPayload = {
  message: string;
  userId?: string | null;
};

type TermsAcceptanceRequiredListener = (
  payload: TermsAcceptanceRequiredPayload,
) => void;

const listeners = new Set<TermsAcceptanceRequiredListener>();

let lastNotificationKey = "";
let lastNotificationTimestamp = 0;

export function isTermsAcceptanceRequiredErrorCode(value: unknown): boolean {
  return value === TERMS_ACCEPTANCE_REQUIRED_ERROR_CODE;
}

export function notifyTermsAcceptanceRequired(
  payload: TermsAcceptanceRequiredPayload,
) {
  const message =
    payload.message.trim() || TERMS_ACCEPTANCE_REQUIRED_FALLBACK_MESSAGE;
  const notificationKey = `${TERMS_ACCEPTANCE_REQUIRED_ERROR_CODE}:${payload.userId ?? "anonymous"}:${message}`;
  const now = Date.now();

  if (
    notificationKey === lastNotificationKey &&
    now - lastNotificationTimestamp < 500
  ) {
    return;
  }

  lastNotificationKey = notificationKey;
  lastNotificationTimestamp = now;

  for (const listener of listeners) {
    listener({ message });
  }
}

export function subscribeToTermsAcceptanceRequired(
  listener: TermsAcceptanceRequiredListener,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function __resetTermsAcceptanceRequiredNotifications() {
  listeners.clear();
  lastNotificationKey = "";
  lastNotificationTimestamp = 0;
}

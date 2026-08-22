export const ACCOUNT_USERNAME_REQUIRED_ERROR_CODE = "ACCOUNT_USERNAME_REQUIRED";
export const ACCOUNT_USERNAME_REQUIRED_FALLBACK_MESSAGE =
  "You must set an account username before using this service.";

type AccountUsernameRequiredPayload = {
  message: string;
  userId?: string | null;
};

type AccountUsernameRequiredListener = (
  payload: AccountUsernameRequiredPayload,
) => void;

const listeners = new Set<AccountUsernameRequiredListener>();

let lastNotificationKey = "";
let lastNotificationTimestamp = 0;

export function isAccountUsernameRequiredErrorCode(value: unknown): boolean {
  return value === ACCOUNT_USERNAME_REQUIRED_ERROR_CODE;
}

export function notifyAccountUsernameRequired(
  payload: AccountUsernameRequiredPayload,
) {
  const message =
    payload.message.trim() || ACCOUNT_USERNAME_REQUIRED_FALLBACK_MESSAGE;
  const notificationKey = `${ACCOUNT_USERNAME_REQUIRED_ERROR_CODE}:${payload.userId ?? "anonymous"}:${message}`;
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
    listener({ message, userId: payload.userId });
  }
}

export function subscribeToAccountUsernameRequired(
  listener: AccountUsernameRequiredListener,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function __resetAccountUsernameRequiredNotifications() {
  listeners.clear();
  lastNotificationKey = "";
  lastNotificationTimestamp = 0;
}

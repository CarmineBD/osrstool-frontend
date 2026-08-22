const PENDING_AUTH_REDIRECT_STORAGE_KEY = "rsmethods-pending-auth-redirect";
const LEGACY_PENDING_AUTH_REDIRECT_STORAGE_KEY =
  "gp-now-pending-auth-redirect";
const PENDING_POST_AUTH_SETUP_STORAGE_KEY =
  "rsmethods-pending-post-auth-setup";
const OAUTH_CALLBACK_PATH = "/login";

export const DEFAULT_AUTH_REDIRECT_PATH = "/account";

type AuthLocation = {
  pathname?: string | null;
  search?: string | null;
  hash?: string | null;
};

function toSafeRedirectUrl(path: string) {
  return new URL(path, "https://rsmethods.local");
}

export function sanitizeAuthRedirectPath(
  path: string | null | undefined,
): string | null {
  const trimmedPath = path?.trim();

  if (!trimmedPath || !trimmedPath.startsWith("/") || trimmedPath.startsWith("//")) {
    return null;
  }

  try {
    const url = toSafeRedirectUrl(trimmedPath);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function buildAuthRedirectPath(
  location: AuthLocation | null | undefined,
): string | null {
  if (!location?.pathname) {
    return null;
  }

  return sanitizeAuthRedirectPath(
    `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`,
  );
}

function isOAuthCallbackPath(path: string) {
  return toSafeRedirectUrl(path).pathname === OAUTH_CALLBACK_PATH;
}

export function getGoogleAuthRedirectTo(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
}

export function markPendingPostAuthSetup() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_POST_AUTH_SETUP_STORAGE_KEY, "1");
}

export function clearPendingPostAuthSetup() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_POST_AUTH_SETUP_STORAGE_KEY);
}

export function consumePendingPostAuthSetup() {
  if (typeof window === "undefined") {
    return false;
  }

  const isPending =
    window.localStorage.getItem(PENDING_POST_AUTH_SETUP_STORAGE_KEY) === "1";
  window.localStorage.removeItem(PENDING_POST_AUTH_SETUP_STORAGE_KEY);
  return isPending;
}

export function persistPendingAuthRedirectPath(
  path: string | null | undefined,
) {
  if (typeof window === "undefined") {
    return;
  }

  const safePath = sanitizeAuthRedirectPath(path);

  if (!safePath || isOAuthCallbackPath(safePath)) {
    window.sessionStorage.removeItem(PENDING_AUTH_REDIRECT_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_PENDING_AUTH_REDIRECT_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(PENDING_AUTH_REDIRECT_STORAGE_KEY, safePath);
  window.sessionStorage.removeItem(LEGACY_PENDING_AUTH_REDIRECT_STORAGE_KEY);
}

export function clearPendingAuthRedirectPath() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_AUTH_REDIRECT_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_PENDING_AUTH_REDIRECT_STORAGE_KEY);
}

export function consumePendingAuthRedirectPath() {
  if (typeof window === "undefined") {
    return null;
  }

  const safePath = sanitizeAuthRedirectPath(
    window.sessionStorage.getItem(PENDING_AUTH_REDIRECT_STORAGE_KEY) ??
      window.sessionStorage.getItem(LEGACY_PENDING_AUTH_REDIRECT_STORAGE_KEY),
  );

  window.sessionStorage.removeItem(PENDING_AUTH_REDIRECT_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_PENDING_AUTH_REDIRECT_STORAGE_KEY);

  if (!safePath || isOAuthCallbackPath(safePath)) {
    return null;
  }

  return safePath;
}

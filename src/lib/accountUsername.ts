export const ACCOUNT_USERNAME_MIN_LENGTH = 3;
export const ACCOUNT_USERNAME_MAX_LENGTH = 20;
export const ACCOUNT_USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]{2,19}$/;
export const RESERVED_ACCOUNT_USERNAMES = new Set([
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "staff",
  "root",
  "system",
  "osrstool",
  "rsmethods",
]);

export function normalizeAccountUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateAccountUsername(value: string): string | null {
  const normalizedValue = normalizeAccountUsername(value);

  if (!normalizedValue) {
    return "Enter an account username.";
  }

  if (
    normalizedValue.length < ACCOUNT_USERNAME_MIN_LENGTH ||
    normalizedValue.length > ACCOUNT_USERNAME_MAX_LENGTH
  ) {
    return `Account username must be between ${ACCOUNT_USERNAME_MIN_LENGTH} and ${ACCOUNT_USERNAME_MAX_LENGTH} characters.`;
  }

  if (!ACCOUNT_USERNAME_PATTERN.test(normalizedValue)) {
    return "Account username must start with a letter or number and use only lowercase letters, numbers, and underscores.";
  }

  if (RESERVED_ACCOUNT_USERNAMES.has(normalizedValue)) {
    return "This account username is reserved.";
  }

  return null;
}

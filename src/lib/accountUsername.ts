export const ACCOUNT_USERNAME_MIN_LENGTH = 3;
export const ACCOUNT_USERNAME_MAX_LENGTH = 20;
export const ACCOUNT_USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]{2,19}$/;
export const ACCOUNT_USERNAME_ALLOWED_CHARACTERS_PATTERN = /^[a-z0-9_]*$/;
export const ACCOUNT_USERNAME_ALLOWED_CHARACTERS_MESSAGE =
  "The username must be between 3 and 20 characters. Lowercase letters, numbers, and underscores only.";
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

export function hasDisallowedAccountUsernameCharacters(value: string): boolean {
  return !ACCOUNT_USERNAME_ALLOWED_CHARACTERS_PATTERN.test(value.toLowerCase());
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
    return "Account username must start with a letter or number.";
  }

  if (RESERVED_ACCOUNT_USERNAMES.has(normalizedValue)) {
    return "This account username is reserved.";
  }

  return null;
}

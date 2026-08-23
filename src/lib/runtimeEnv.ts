export type RuntimeEnvironmentLabel = "LOCAL" | "TST" | "BETA" | null;

export function getRuntimeEnvironmentLabel(
  hostname: string,
  isDev: boolean,
): RuntimeEnvironmentLabel {
  const normalizedHostname = hostname.trim().toLowerCase();

  if (
    isDev ||
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1"
  ) {
    return "LOCAL";
  }

  if (
    normalizedHostname.includes("tst") ||
    normalizedHostname.startsWith("test.") ||
    normalizedHostname.includes(".test.") ||
    normalizedHostname.startsWith("staging.") ||
    normalizedHostname.includes(".staging.")
  ) {
    return "TST";
  }

  return "BETA";
}

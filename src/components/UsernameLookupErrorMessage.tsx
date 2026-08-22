const LOGIN_REQUIRED_MESSAGE = "sign-in/login to fetch data by osrs usernames";

function shouldShowWikiSyncGuidance(message: string) {
  const normalizedMessage = message.trim().toLowerCase();
  if (!normalizedMessage || normalizedMessage === LOGIN_REQUIRED_MESSAGE) {
    return false;
  }

  if (
    normalizedMessage.includes("wiki") ||
    normalizedMessage.includes("sync.runescape.wiki") ||
    normalizedMessage.includes("wikisync") ||
    normalizedMessage.includes("runelite")
  ) {
    return true;
  }

  const mentionsUserLookup =
    normalizedMessage.includes("player data") ||
    normalizedMessage.includes("player profile") ||
    normalizedMessage.includes("user data") ||
    normalizedMessage.includes("stats lookup");
  const mentionsUsernameRequest =
    normalizedMessage.includes("username") &&
    (normalizedMessage.includes("fetch") ||
      normalizedMessage.includes("load") ||
      normalizedMessage.includes("lookup") ||
      normalizedMessage.includes("profile") ||
      normalizedMessage.includes("stats"));

  return mentionsUserLookup || mentionsUsernameRequest;
}

export function UsernameLookupErrorMessage({
  message,
  helperClassName,
}: {
  message: string;
  helperClassName?: string;
}) {
  const showWikiSyncGuidance = shouldShowWikiSyncGuidance(message);

  return (
    <div className="space-y-1">
      <p>{message}</p>
      {showWikiSyncGuidance ? (
        <p className={helperClassName}>
          Make sure the RuneLite `WikiSync` plugin is installed and enabled so
          RSMethods can read your character data.
        </p>
      ) : null}
    </div>
  );
}

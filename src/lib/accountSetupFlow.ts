export type AccountSetupLocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

export function resolveAccountSetupRedirectPath(
  state: AccountSetupLocationState | null,
) {
  if (!state?.from?.pathname) {
    return "/account";
  }

  return `${state.from.pathname}${state.from.search ?? ""}${state.from.hash ?? ""}`;
}

export function buildAccountSetupLocationState(
  path: string,
): AccountSetupLocationState {
  const url = new URL(path, "https://rsmethods.local");

  return {
    from: {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    },
  };
}

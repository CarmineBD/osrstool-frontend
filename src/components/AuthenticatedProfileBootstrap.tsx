import { useMe } from "@/hooks/useMe";

export function AuthenticatedProfileBootstrap() {
  useMe();
  return null;
}

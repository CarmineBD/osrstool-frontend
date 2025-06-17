const API_URL = import.meta.env.VITE_API_URL as string;

export interface Variant {
  id: string;
  label: string;
  xpHour: Record<string, number>;
  clickIntensity: number | null;
  afkiness: number | null;
  riskLevel: string | null;
  lowProfit: number;
  highProfit: number;
}

export interface Method {
  id: string;
  name: string;
  category: string;
  variants: Variant[];
}

export interface MethodsResponse {
  data: Method[];
  meta: {
    total: number;
    page: number;
    perPage: number;
  };
}

export async function fetchMethods(params: { username?: string; page?: number } = {}): Promise<MethodsResponse> {
  const url = new URL(`${API_URL}/methods`);
  if (params.username) url.searchParams.set("username", params.username);
  if (params.page) url.searchParams.set("page", params.page.toString());
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

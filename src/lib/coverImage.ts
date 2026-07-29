const WSRV_PREFIX = "https://wsrv.nl/";

export type CoverImageParams = {
  q?: number;
  w?: number;
  h?: number;
  fit?: string;
};

/**
 * 仅对 wsrv.nl 封面追加场景参数（质量/尺寸）。
 * 非 wsrv 外链原样返回；假定入库 URL 不含 q/w/h/fit，直接 append。
 */
export function withCoverImageParams(
  url: string | null | undefined,
  params: CoverImageParams,
): string | null {
  if (!url) return null;
  if (!url.startsWith(WSRV_PREFIX)) return url;

  const parts: string[] = [];
  if (params.q != null) parts.push(`q=${params.q}`);
  if (params.w != null) parts.push(`w=${params.w}`);
  if (params.h != null) parts.push(`h=${params.h}`);
  if (params.fit) parts.push(`fit=${params.fit}`);
  if (parts.length === 0) return url;

  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${parts.join("&")}`;
}

// URL-safe id for path segments. Serie A entity ids look like
// "serie-a::Football_Player::<hex>" — use the trailing hex; PL/La Liga ids are
// already numeric and pass through unchanged. Used by both server (route params
// + generateStaticParams) and client (building hrefs).
export function safeId(id: string | number): string {
  const s = String(id);
  return s.includes("::") ? s.split("::").pop()! : s;
}

/** Where a tapped reminder should open. Only the app's own routes are accepted; anything else lands on Home. */
const ROUTE = /^\/(milestones|play-tips|watch-outs)\/([1-9]|[12][0-9]|3[0-6])\/$|^\/(memo|settings)\/$/;

export function notificationTarget(extra: unknown): string {
  const url = extra && typeof extra === "object" ? (extra as { url?: unknown }).url : undefined;
  return typeof url === "string" && ROUTE.test(url) ? url : "/";
}

// Best-effort iOS/iPadOS detection. Kept deliberately simple: `navigator`
// exists in the SSR (Node) runtime with only a `userAgent` string, so this
// returns false server-side without throwing, and the real check runs again
// on the client. iPadOS 13+ reports a desktop UA, hence the MacIntel +
// touch-points branch.
export const isIOSDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

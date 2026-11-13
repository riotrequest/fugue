/**
 * "N playing": how many people have the game open. Each open tab pings
 * online.php about once a minute with a random id made up here, never saved.
 * Where there is no such endpoint (local development, a fork on static
 * hosting) the counter simply stays hidden.
 */

const ENDPOINT = 'online.php';
const PING_MS = 60_000;

/** A throwaway id for this tab: 16 random lowercase letters and digits. */
function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
}

/** @param {HTMLElement} node */
export function startOnline(node) {
  const id = randomId();
  let timer = 0;

  const show = (count) => {
    node.hidden = !(count >= 1);
    if (count >= 1) node.textContent = `${count} playing`;
    node.title = 'people with the game open right now';
  };

  const ping = async () => {
    try {
      const response = await fetch(`${ENDPOINT}?id=${id}`, { cache: 'no-store' });
      const data = response.ok ? await response.json() : null;
      show(Number(data?.online));
    } catch {
      show(0);
    }
  };

  const schedule = () => {
    clearInterval(timer);
    if (document.hidden) return;
    ping();
    timer = setInterval(ping, PING_MS);
  };

  // A hidden tab stops pinging and drops out of the count after a couple of minutes.
  document.addEventListener('visibilitychange', schedule);
  schedule();
}

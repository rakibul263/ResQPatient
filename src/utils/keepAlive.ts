/**
 * Keep-Alive Heartbeat Utility for Render Free Tier
 *
 * Render spins down free web services after 15 minutes of inactivity.
 * This utility automatically pings the service's public URL every 10 minutes
 * to keep the service continuously active 24/7.
 */

export const initKeepAlive = () => {
  const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  const siteUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.SITE_URL ||
    "https://resqpatient.onrender.com";

  // Only run keep-alive in production or when explicitly enabled
  if (!isProduction && !process.env.ENABLE_KEEP_ALIVE) {
    return;
  }

  const pingUrl = `${siteUrl.replace(/\/+$/, "")}/ping`;
  const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

  console.log(`[Keep-Alive] Initialized self-ping service for: ${pingUrl} (every 10m)`);

  const ping = async () => {
    try {
      const response = await fetch(pingUrl, {
        headers: { "User-Agent": "ResQPatient-KeepAlive-Bot/1.0" },
      });
      console.log(`[Keep-Alive] Heartbeat ping to ${pingUrl} - Status: ${response.status} (${response.statusText})`);
    } catch (error: any) {
      console.warn(`[Keep-Alive] Heartbeat ping failed (will retry): ${error?.message || error}`);
    }
  };

  // Initial delay of 2 minutes after server boot, then recur every 10 minutes
  setTimeout(() => {
    ping();
    setInterval(ping, PING_INTERVAL);
  }, 2 * 60 * 1000);
};

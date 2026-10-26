export async function register() {
  // Check settings when the server starts, not on the first request that needs them.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/site");
    const { mediaStorage } = await import("@/lib/media-storage");
    mediaStorage();
  }
}

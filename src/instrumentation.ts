export async function register() {
  // Check the media storage settings when the server starts, not on the first upload.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { mediaStorage } = await import("@/lib/media-storage");
    mediaStorage();
  }
}

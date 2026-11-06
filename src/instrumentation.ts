export async function register() {
  // Check settings when the server starts, not on the first request that needs them.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/site");
    const { mediaStorage } = await import("@/lib/media-storage");
    mediaStorage();
    const { canSendMail } = await import("@/lib/mail");
    if (!canSendMail()) {
      console.warn("Email isn't set up (SMTP_HOST and the rest), so passwords can't be reset.");
    }
  }
}

export function chatOriginAllowed(
  request: Request,
  env: {
    NODE_ENV?: string;
    NEXT_PUBLIC_SITE_URL?: string;
    CHAT_DEV_SITE_URL?: string;
  },
) {
  try {
    const allowed = [new URL(env.NEXT_PUBLIC_SITE_URL || request.url).origin];
    if (env.NODE_ENV === "development") {
      allowed.push(new URL(request.url).origin);
      if (env.CHAT_DEV_SITE_URL)
        allowed.push(new URL(env.CHAT_DEV_SITE_URL).origin);
    }
    return allowed.includes(request.headers.get("origin") || "");
  } catch {
    return false;
  }
}

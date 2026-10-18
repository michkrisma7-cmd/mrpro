// Local development follows the address being opened, independently of the
// canonical URL used for metadata. Production keeps the configured origin.
export function registrationOriginAllowed(
  request: Request,
  env: { NODE_ENV?: string; NEXT_PUBLIC_SITE_URL?: string },
) {
  try {
    const expected = new URL(
      env.NODE_ENV === "development"
        ? request.url
        : env.NEXT_PUBLIC_SITE_URL || request.url,
    ).origin;
    return request.headers.get("origin") === expected;
  } catch {
    return false;
  }
}

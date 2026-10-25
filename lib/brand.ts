// A stable revision changes icon URLs when the identity changes, not per request.
export const brandAssetVersion = "20261024";
export const brandIconUrl = (path: string) => `${path}?v=${brandAssetVersion}`;

export const brandIcons = [16, 32, 48, 192, 512].map((size) => ({
  src: brandIconUrl(`/${size <= 48 ? "favicon" : "icon"}-${size}x${size}.png`),
  sizes: `${size}x${size}`,
  type: "image/png",
}));

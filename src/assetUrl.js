// Absolute URL under the deploy base (GitHub Pages serves the app from /<repo>/, not from the root).
export const assetUrl = (path) => import.meta.env.BASE_URL + path;

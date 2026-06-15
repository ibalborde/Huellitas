/** Default search radius; mirrors the `posts_nearby` SQL default. */
export const RADIUS_DEFAULT_M = 5000;

/** The server caps the radius at 50 km; the UI must not offer more. */
export const RADIUS_MAX_M = 50_000;

/** Page size for the infinite nearby feed (server clamps p_limit to 1-200). */
export const POSTS_PAGE_SIZE = 20;

/**
 * Radius choices offered by the filter bar, ascending and all within
 * RADIUS_MAX_M. Also drives the "widen the search" suggestion on empty feeds.
 */
export const RADIUS_PRESETS_M = [1_000, 5_000, 10_000, 25_000] as const;

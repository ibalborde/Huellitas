/**
 * Public API of the posts feature.
 * UI imports from here; the data layer (postsRepository) is internal and is
 * only imported by hooks and by integration tests.
 */
export type { Post, PostFilters, PostStatus, PostType, Species } from './domain/post';
export { POSTS_PAGE_SIZE, RADIUS_DEFAULT_M, RADIUS_MAX_M } from './domain/constants';
export { postsKeys, usePostsNearby, type UsePostsNearbyParams } from './hooks/usePostsNearby';

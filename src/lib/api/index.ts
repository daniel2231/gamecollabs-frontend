import 'server-only';
import { cache } from 'react';
import { isMockApi } from './config';
import { createHttpAdminApi, httpPublicApi } from './http';
import { mockAdminApi, mockPublicApi } from './mock/service';
import type { AdminApi, PublicApi } from './types';

export { ApiError } from './types';
export type { AdminApi, PublicApi } from './types';
export { isMockApi } from './config';

/** 호출할 때마다 API_BASE_URL을 보고 목/실제를 고른다 */
const pick = (): PublicApi => (isMockApi() ? mockPublicApi : httpPublicApi);

/** 같은 렌더 안에서 같은 요청을 한 번만 보내도록 React cache로 감싼다 */
export const api: PublicApi = {
  listCollabs: (...a) => pick().listCollabs(...a),
  getCollab: cache((...a: Parameters<PublicApi['getCollab']>) => pick().getCollab(...a)),
  getProperty: cache((...a: Parameters<PublicApi['getProperty']>) => pick().getProperty(...a)),
  getCompany: cache((...a: Parameters<PublicApi['getCompany']>) => pick().getCompany(...a)),
  getTaxonomies: cache(() => pick().getTaxonomies()),
  getStats: () => pick().getStats(),
  getSitemap: () => pick().getSitemap(),
};

export function adminApi(token: string): AdminApi {
  return isMockApi() ? mockAdminApi : createHttpAdminApi(token);
}

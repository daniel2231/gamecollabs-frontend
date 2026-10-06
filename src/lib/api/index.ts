import 'server-only';
import { cache } from 'react';
import { createHttpAdminApi, httpPublicApi } from './http';
import { mockAdminApi, mockPublicApi } from './mock/service';
import type { AdminApi, PublicApi } from './types';

export { ApiError } from './types';
export type { AdminApi, PublicApi } from './types';

/** API_BASE_URL이 없으면 메모리 목 데이터로 동작 */
export const usingMockApi = !process.env.API_BASE_URL;

const base: PublicApi = usingMockApi ? mockPublicApi : httpPublicApi;

/** 같은 렌더 안에서 같은 요청을 한 번만 보내도록 React cache로 감싼다 */
export const api: PublicApi = {
  ...base,
  getCollab: cache(base.getCollab),
  getProperty: cache(base.getProperty),
  getCompany: cache(base.getCompany),
  getTaxonomies: cache(base.getTaxonomies),
};

export function adminApi(token: string): AdminApi {
  return usingMockApi ? mockAdminApi : createHttpAdminApi(token);
}

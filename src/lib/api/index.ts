import 'server-only';
import { cache } from 'react';
import { isMockApi } from './config';
import { createHttpAdminApi, createHttpMemberApi, httpPublicApi } from './http';
import { mockAdminApi, mockMemberApi, mockPublicApi } from './mock/service';
import type { Locale } from '@/schema';
import type { AdminApi, MemberApi, PublicApi, StatsQuery } from './types';

export { ApiError } from './types';
export type { AdminApi, DiscordProfile, FollowedEntity, FollowType, MemberApi, MemberProfile, MemberState, PublicApi } from './types';
export { isMockApi } from './config';

/** 호출할 때마다 API_BASE_URL을 보고 목/실제를 고른다 */
const pick = (): PublicApi => (isMockApi() ? mockPublicApi : httpPublicApi);

/** cache는 인자를 참조로 비교하므로 객체 대신 원시값으로 받는다 */
const statsCached = cache((locale?: Locale, year?: number) => pick().getStats({ locale, year }));

/** 같은 렌더 안에서 같은 요청을 한 번만 보내도록 React cache로 감싼다 */
export const api: PublicApi = {
  listCollabs: (...a) => pick().listCollabs(...a),
  getCollab: cache((...a: Parameters<PublicApi['getCollab']>) => pick().getCollab(...a)),
  getProperty: cache((...a: Parameters<PublicApi['getProperty']>) => pick().getProperty(...a)),
  getCompany: cache((...a: Parameters<PublicApi['getCompany']>) => pick().getCompany(...a)),
  getTaxonomies: cache(() => pick().getTaxonomies()),
  getStats: (query?: StatsQuery) => statsCached(query?.locale, query?.year),
  listFeaturedProperties: (...a) => pick().listFeaturedProperties(...a),
  getSitemap: () => pick().getSitemap(),
  submitReport: (...a) => pick().submitReport(...a),
  listChangelog: cache((...a: Parameters<PublicApi['listChangelog']>) => pick().listChangelog(...a)),
  upsertDiscordMember: (...a) => pick().upsertDiscordMember(...a),
};

export function adminApi(token: string): AdminApi {
  return isMockApi() ? mockAdminApi : createHttpAdminApi(token);
}

/** 회원 JWT(쿠키 ct_member)로 부르는 /v1/me/* */
export function memberApi(token: string): MemberApi {
  return isMockApi() ? mockMemberApi(token) : createHttpMemberApi(token);
}

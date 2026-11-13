import type { Locale } from '@/i18n/routing';
import type { LegalContact } from '@/lib/legal';

/**
 * 개인정보 처리방침 본문(마크다운). 「개인정보 보호법」 제30조와 표준 개인정보 처리방침 작성지침의 항목 순서를 따른다.
 * 실제 수집 항목은 Discord 콜백(src/app/api/auth/discord/callback), 제보 액션((site)/actions.ts),
 * Analytics·Turnstile 컴포넌트, 쿠키 설정(lib/auth/member.ts, proxy.ts)과 맞춰야 한다.
 * 백엔드(gamecollabs-backend)에서 확인한 사실: 회원 탈퇴는 즉시 하드 삭제, 제보의 ipHash는 기한 없이 제보와 함께 보관,
 * pino-http 접속 기록에 X-Client-IP(제보자 IP 원문)가 남음, 국내 자체 서버 + Cloudflare Tunnel, DB 백업은 Cloudflare R2에 30일.
 */
export function privacyMarkdown(locale: Locale, c: LegalContact): string {
  return locale === 'ko' ? ko(c) : en(c);
}

function ko({ operator, email }: LegalContact): string {
  const who = operator ?? 'GameCollabs 운영자';
  const reach = email ? `이메일 [${email}](mailto:${email})` : '[콜라보 제보](/ko/report) 페이지의 메모 칸';
  return `GameCollabs(이하 “서비스”)는 운영자 1인이 운영하는 개인 프로젝트로, 「개인정보 보호법」 등 관련 법령을 지키며, 이용자의 개인정보를 필요한 만큼만 받고 안전하게 다룹니다. 이 방침은 서비스가 어떤 정보를 왜 처리하고 언제 지우는지 알려 드립니다.

## 1. 처리하는 개인정보와 목적

서비스는 회원가입 없이도 모든 콜라보 정보를 볼 수 있습니다. 아래 기능을 쓸 때만 해당 정보를 처리합니다.

**Discord 로그인(회원)**

- 항목: Discord 사용자 ID, 사용자 이름, 표시 이름, 프로필 사진 식별값(해시), 저장한 콜라보·팔로우한 작품과 회사 목록, 마지막 로그인 시각
- 목적: 회원 식별과 로그인 유지, 저장·팔로우·피드 기능 제공, 부정 이용 방지
- 이메일, Discord 서버 목록, 메시지는 받지 않습니다. Discord 접근 토큰은 프로필을 한 번 읽은 직후 폐기하며 보관하지 않습니다.

**콜라보 제보·오류 제보**

- 항목: 입력한 링크와 메모, 접속 IP 주소의 해시값
- 목적: 제보 내용 확인과 콜라보 정보 등록·수정, 반복 제출·자동 입력 등 남용 방지
- 이름이나 연락처는 받지 않습니다. 제보 기록에는 IP 주소를 비밀값을 섞은 해시로만 저장해, 해시만으로는 원래 주소를 알 수 없습니다. 다만 아래 ‘자동으로 생성되는 정보’처럼 서버 접속 기록에는 IP 주소가 남습니다. 메모에 개인정보를 적지 말아 주세요.

**서비스 이용 과정에서 자동으로 생성되는 정보**

- 항목: 접속 IP 주소, 브라우저·기기 정보, 방문 페이지와 시각, 쿠키, 서버 접속 기록(제보를 보낼 때의 IP 주소 포함)
- 목적: 서비스 운영과 보안, 오류 확인, 이용 통계(어떤 페이지가 많이 읽히는지 등) 분석

## 2. 보유 및 이용 기간

- 회원 정보와 저장·팔로우 목록: 탈퇴할 때까지 보관하며, 탈퇴하면 운영 데이터베이스에서 바로 지웁니다. 장애 복구용 데이터베이스 백업에는 최대 30일 동안 남아 있다가 자동으로 지워집니다.
- 제보 내용(링크, 메모, IP 해시): 콜라보 정보의 근거와 남용 방지 기록으로, 서비스를 운영하는 동안 보관합니다. 지우기를 원하면 아래 9항의 문의처로 요청해 주세요.
- 서버 접속 기록: 서비스 운영과 보안에 필요한 기간 동안 보관합니다.
- 로그인 쿠키: 최대 30일. 로그아웃하면 바로 지워집니다.
- 이용 통계(Google Analytics): 이벤트 데이터는 2개월, 사용자 수준 데이터는 14개월 뒤 자동으로 지워집니다.
- 법령에 따라 보관해야 하는 경우에는 그 기간 동안 보관합니다.

## 3. 개인정보의 제3자 제공

서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 특별한 규정이 있거나 수사기관이 법령에 정해진 절차에 따라 요청하는 경우는 예외입니다.

## 4. 처리 위탁과 국외 이전

회원 정보와 제보를 저장하는 데이터베이스와 API 서버는 운영자가 대한민국에서 직접 운영합니다. 그 밖에 아래 업체의 서비스를 이용하며, 이 과정에서 정보가 국외(주로 미국)에서 처리될 수 있습니다. 각 업체는 정보를 전송받은 시점부터 자신의 개인정보 처리방침에 따라 처리합니다.

- **Vercel Inc.** (미국): 웹사이트 호스팅. 모든 방문의 접속 IP 주소, 요청 정보, 접속 국가가 처리되며, 로그인할 때 받은 Discord 프로필과 제보 내용이 국내 서버로 전달되는 과정에서 거쳐 갑니다. 보유 기간: Vercel의 로그 보관 정책에 따름.
- **Cloudflare, Inc.** (미국): ① 국내 API 서버로 들어가는 통신을 중계하는 보안 터널(Cloudflare Tunnel). 회원 정보, 제보 내용, 제보자 IP 주소가 암호화된 상태로 거쳐 가며 저장되지 않습니다. ② 데이터베이스 백업 저장(Cloudflare R2). 회원 정보, 저장·팔로우 목록, 제보 내용이 매일 백업되어 30일 동안 보관됩니다. ③ 제보 폼의 자동 입력 방지(Turnstile). 브라우저·기기 정보와 접속 IP 주소가 전송됩니다.
- **Discord Inc.** (미국): 회원 로그인(OAuth). 로그인할 때 Discord에서 위 1항의 프로필 정보를 받습니다.
- **Google LLC** (미국): 이용 통계(Google Analytics). 쿠키, 접속 IP 주소, 브라우저·기기 정보, 방문 페이지가 전송되며, 위 2항의 기간 동안 보관됩니다.

정보는 이용자가 서비스를 이용하는 시점(백업은 매일 1회)에 네트워크를 통해 암호화되어 전송됩니다. 국외 이전을 원하지 않으면 Discord 로그인과 제보 기능을 쓰지 않거나, 아래 6항의 방법으로 통계 수집을 거부할 수 있습니다. 다만 호스팅은 서비스 제공에 꼭 필요해 거부할 수 없습니다.

## 5. 개인정보의 파기

보유 기간이 끝나거나 처리 목적을 이루면 지체 없이 파기합니다. 전자적 파일은 복구할 수 없는 방법으로 지우며, 종이 문서로는 개인정보를 다루지 않습니다.

## 6. 쿠키 등 자동 수집 장치

서비스는 아래 쿠키를 씁니다.

- \`ct_member\`: 로그인 유지(최대 30일, 로그인한 경우에만)
- \`ct_discord_state\`: Discord 로그인 요청 위조 방지(10분, 로그인하는 동안에만)
- \`NEXT_LOCALE\`: 고른 언어 기억
- \`_ga\`, \`_ga_*\`: Google Analytics 이용 통계
- Cloudflare Turnstile이 제보 폼에서 자동 입력 방지를 위해 쓰는 쿠키

브라우저 설정에서 쿠키 저장을 거부하거나 지울 수 있습니다. 이 경우 로그인 같은 일부 기능을 쓸 수 없습니다. Google Analytics 수집만 거부하려면 [Google 애널리틱스 차단 브라우저 부가기능](https://tools.google.com/dlpage/gaoptout)을 쓸 수 있습니다.

## 7. 이용자의 권리와 행사 방법

이용자는 언제든 자신의 개인정보를 열람·정정·삭제하거나 처리 정지를 요구할 수 있습니다.

- 열람: [내 계정](/ko/account) 페이지에서 저장된 프로필과 저장·팔로우 수를 볼 수 있습니다.
- 정정: 프로필 정보는 Discord에서 바꾼 뒤 다시 로그인하면 반영됩니다.
- 삭제: [내 계정](/ko/account) 페이지에서 바로 탈퇴할 수 있으며, 탈퇴하면 회원 정보와 목록이 모두 지워집니다.
- 그 밖의 요구는 아래 9항의 문의처로 보내 주시면 지체 없이 처리합니다.

## 8. 안전성 확보 조치

- 로그인 세션은 서명된 토큰으로 관리하고, 자바스크립트로 읽을 수 없는(httpOnly) 쿠키에 둡니다.
- 모든 통신은 HTTPS로 암호화합니다.
- API 서버는 인터넷에 직접 열려 있지 않고, 암호화된 터널과 서비스 토큰으로만 접근할 수 있습니다.
- 관리자 화면은 허가된 운영자 계정만 쓸 수 있습니다.
- 데이터베이스는 매일 백업하고, 백업은 30일이 지나면 자동으로 지웁니다.
- 꼭 필요한 정보만 받고, 받지 않아도 되는 정보(이메일, Discord 토큰 등)는 저장하지 않습니다.

## 9. 개인정보 보호책임자와 문의처

서비스는 운영자 1인이 운영하며, 운영자가 개인정보 보호책임자를 겸합니다.

- 개인정보 보호책임자: ${who}
- 문의: ${reach}

## 10. 만 14세 미만 아동

서비스는 만 14세 미만 아동의 회원가입을 받지 않습니다. Discord 이용약관에 따른 이용 가능 연령도 확인해 주세요. 만 14세 미만 아동의 정보가 수집된 사실을 알게 되면 바로 지웁니다.

## 11. 권익침해 구제 방법

개인정보 침해에 대한 신고나 상담이 필요하면 아래 기관에 문의할 수 있습니다.

- 개인정보침해신고센터: (국번없이) 118, [privacy.kisa.or.kr](https://privacy.kisa.or.kr)
- 개인정보분쟁조정위원회: 1833-6972, [www.kopico.go.kr](https://www.kopico.go.kr)
- 대검찰청 사이버수사과: (국번없이) 1301, [www.spo.go.kr](https://www.spo.go.kr)
- 경찰청 사이버수사국: (국번없이) 182, [ecrm.police.go.kr](https://ecrm.police.go.kr)

## 12. 처리방침의 변경

이 방침을 바꾸면 시행 7일 전에 이 페이지와 [변경 내역](/ko/changelog)에 알립니다. 이용자 권리에 중요한 변경은 30일 전에 알립니다.
`;
}

function en({ operator, email }: LegalContact): string {
  const who = operator ?? 'the GameCollabs operator';
  const reach = email ? `email [${email}](mailto:${email})` : 'the note field on the [Submit a collab](/en/report) page';
  return `GameCollabs (“the Service”) is a personal project run by a single operator. It collects only the personal information it needs and handles it in line with applicable law, including the Personal Information Protection Act of the Republic of Korea. This policy explains what we process, why, and when we delete it.

## 1. What we process and why

You can browse every collab without an account. We process the information below only when you use the matching feature.

**Discord sign-in (members)**

- Data: Discord user ID, username, display name, avatar identifier (hash), the collabs you save and the properties and companies you follow, and when you last signed in
- Purpose: identifying you and keeping you signed in, providing saves, follows and your feed, and preventing abuse
- We don’t receive your email, servers or messages. The Discord access token is discarded right after reading your profile once and is never stored.

**Collab submissions and issue reports**

- Data: the link and note you enter, and a hash of your IP address
- Purpose: checking your submission and adding or correcting collab information, and preventing spam and automated submissions
- We don’t ask for your name or contact details. The submission record stores your IP address only as a hash mixed with a secret, so the address can’t be read back from it. Server access logs do keep the IP address, as described below. Please don’t put personal information in the note.

**Information generated automatically when you use the Service**

- Data: IP address, browser and device information, pages visited and when, cookies, server access logs (including your IP address when you send a submission)
- Purpose: running and securing the Service, diagnosing errors, and usage statistics (such as which pages are read most)

## 2. How long we keep it

- Member information and your saves and follows: until you delete your account, then deleted from the live database immediately. They remain in disaster-recovery database backups for up to 30 days, which are then deleted automatically.
- Submissions (link, note, IP hash): kept for as long as the Service runs, as the source record for collab information and to prevent abuse. Contact us as in section 9 to have yours deleted.
- Server access logs: for as long as needed to run and secure the Service.
- Sign-in cookie: up to 30 days; removed as soon as you sign out.
- Usage statistics (Google Analytics): event data is deleted after 2 months and user-level data after 14 months.
- Where the law requires us to keep information longer, we keep it for that period.

## 3. Sharing with third parties

We don’t share your personal information with third parties, except where the law specifically requires it or an investigative authority requests it under legal procedure.

## 4. Service providers and international transfers

The database and API server that store member information and submissions are run by the operator in the Republic of Korea. We also use the providers below, so your information may be processed outside your country, mainly in the United States. Each provider handles the information it receives under its own privacy policy.

- **Vercel Inc.** (USA): website hosting. Every visit’s IP address, request details and country are processed, and the Discord profile received at sign-in and your submissions pass through it on their way to our server in Korea. Retention: per Vercel’s log retention.
- **Cloudflare, Inc.** (USA): (1) a secure tunnel (Cloudflare Tunnel) that carries traffic to our API server in Korea; member information, submissions and submitters’ IP addresses pass through it encrypted and are not stored. (2) Database backup storage (Cloudflare R2); member information, saves, follows and submissions are backed up daily and kept for 30 days. (3) Bot protection on the submission form (Turnstile); browser and device information and your IP address are sent.
- **Discord Inc.** (USA): member sign-in (OAuth). We receive the profile information in section 1 from Discord when you sign in.
- **Google LLC** (USA): usage statistics (Google Analytics). Cookies, IP address, browser and device information and pages visited are sent and kept for the periods in section 2.

Information is transferred encrypted over the network at the moment you use the Service (backups once a day). If you don’t want it transferred, you can avoid Discord sign-in and submissions, or opt out of statistics as described in section 6. Hosting is essential to providing the Service and can’t be opted out of.

## 5. Deletion

When the retention period ends or the purpose is achieved, we delete the information without delay. Electronic files are deleted so they can’t be recovered; we don’t keep personal information on paper.

## 6. Cookies

We use the following cookies.

- \`ct_member\`: keeps you signed in (up to 30 days, only when signed in)
- \`ct_discord_state\`: protects the Discord sign-in request against forgery (10 minutes, only while signing in)
- \`NEXT_LOCALE\`: remembers your language
- \`_ga\`, \`_ga_*\`: Google Analytics usage statistics
- Cookies Cloudflare Turnstile uses for bot protection on the submission form

You can block or delete cookies in your browser settings; some features, such as signing in, won’t work without them. To opt out of Google Analytics only, use the [Google Analytics Opt-out Browser Add-on](https://tools.google.com/dlpage/gaoptout).

## 7. Your rights

You can access, correct or delete your personal information, or ask us to stop processing it, at any time.

- Access: your [account](/en/account) page shows your stored profile and how many collabs you saved and follow.
- Correction: change your profile on Discord and sign in again.
- Deletion: delete your account from your [account](/en/account) page; this removes your member information and lists.
- For anything else, contact us as described in section 9 and we will respond without delay.

## 8. Security

- Sign-in sessions use signed tokens kept in cookies that JavaScript can’t read (httpOnly).
- All traffic is encrypted with HTTPS.
- The API server isn’t exposed directly to the internet; it can only be reached through an encrypted tunnel with a service token.
- Only authorized operator accounts can use the admin pages.
- The database is backed up daily, and backups are deleted automatically after 30 days.
- We collect only what we need and don’t store what we don’t (email, Discord tokens and so on).

## 9. Privacy officer and contact

The Service is run by a single operator, who is also the privacy officer.

- Privacy officer: ${who}
- Contact: ${reach}

## 10. Children

The Service doesn’t accept members under 14. Please also check the minimum age in Discord’s terms. If we learn we have collected information from a child under 14, we delete it immediately.

## 11. Getting help

If you are in Korea and need to report or discuss a privacy violation, you can contact the Personal Information Infringement Report Center (118, [privacy.kisa.or.kr](https://privacy.kisa.or.kr)) or the Personal Information Dispute Mediation Committee (1833-6972, [www.kopico.go.kr](https://www.kopico.go.kr)). Elsewhere, you can contact your local data protection authority.

## 12. Changes

We announce changes on this page and in the [changelog](/en/changelog) at least 7 days before they take effect, or 30 days before for changes that materially affect your rights.
`;
}

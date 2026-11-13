import type { Locale } from '@/i18n/routing';
import type { LegalContact } from '@/lib/legal';

/** 이용약관 본문(마크다운). 무료·정보 제공 서비스에 맞춰 짧게 둔다 */
export function termsMarkdown(locale: Locale, c: LegalContact): string {
  return locale === 'ko' ? ko(c) : en(c);
}

function ko({ email }: LegalContact): string {
  const reach = email ? `이메일 [${email}](mailto:${email})` : '[콜라보 제보](/ko/report) 페이지';
  return `## 제1조 (목적)

이 약관은 GameCollabs(이하 “서비스”)가 제공하는 게임 콜라보 정보 서비스의 이용 조건과 절차, 서비스와 이용자의 권리·의무를 정합니다.

## 제2조 (정의)

- “이용자”는 이 약관에 따라 서비스를 이용하는 모든 사람을 말합니다.
- “회원”은 Discord 계정으로 로그인해 저장·팔로우 등 회원 기능을 쓰는 이용자를 말합니다.
- “제보”는 이용자가 콜라보 정보나 오류를 알리려고 보내는 링크와 메모를 말합니다.

## 제3조 (약관의 효력과 변경)

1. 이 약관은 서비스 화면에 게시하면 효력이 생기며, 이용자는 서비스를 이용함으로써 약관에 동의한 것으로 봅니다.
2. 서비스는 관련 법령을 어기지 않는 범위에서 약관을 바꿀 수 있습니다. 바꿀 때는 시행 7일 전(이용자에게 불리한 변경은 30일 전)에 이 페이지와 [변경 내역](/ko/changelog)에 알립니다.
3. 바뀐 약관에 동의하지 않는 회원은 탈퇴할 수 있습니다. 시행일 이후에도 서비스를 계속 쓰면 바뀐 약관에 동의한 것으로 봅니다.

## 제4조 (서비스의 내용)

1. 서비스는 게임과 애니메이션·웹툰·영화·캐릭터·브랜드 등 지식재산(IP)의 콜라보 정보를 공개 출처를 바탕으로 정리해 무료로 제공합니다.
2. 회원은 콜라보 저장, 작품·회사 팔로우, 팔로우 피드 기능을 쓸 수 있습니다.
3. 서비스는 운영상·기술상 필요에 따라 기능을 바꾸거나 일시 중단·종료할 수 있습니다. 무료 서비스이므로 이로 인해 이용자에게 따로 보상하지 않습니다.

## 제5조 (회원 가입과 탈퇴)

1. 회원 가입은 Discord 계정으로 로그인하면 이루어집니다. 만 14세 미만은 가입할 수 없습니다.
2. 회원은 언제든 [내 계정](/ko/account) 페이지에서 탈퇴할 수 있으며, 탈퇴하면 회원 정보와 저장·팔로우 목록이 바로 지워집니다.
3. 서비스는 회원이 제7조를 어기면 사전 통지 없이 이용을 제한하거나 계정을 삭제할 수 있습니다.

## 제6조 (정보의 정확성)

1. 서비스는 공식 발표, 보도 기사, 공식 SNS 등 공개 출처를 확인해 정보를 올리지만, 그 정확성·완전성·최신성을 보증하지 않습니다. 일정·보상·참여 조건 등은 각 게임과 IP의 공식 안내를 확인하세요.
2. 서비스는 소개된 회사·게임·IP와 제휴 관계가 없으며, 이들로부터 보증을 받지 않았습니다.
3. 틀린 정보를 발견하면 각 콜라보 페이지의 “오류 제보”로 알려 주세요.

## 제7조 (이용자의 의무)

이용자는 다음 행위를 해서는 안 됩니다.

- 거짓 정보나 다른 사람의 개인정보, 불법·음란·혐오 내용을 제보하는 행위
- 광고·스팸을 보내거나, 자동화된 수단으로 제보를 반복해서 보내는 행위
- 서비스에 과도한 부하를 주는 방식으로 자동 수집(크롤링)하거나, 보안 장치를 우회·방해하는 행위
- 다른 사람의 계정을 쓰거나, 서비스 운영을 방해하는 행위
- 서비스의 정보를 출처 표시 없이 그대로 복제해 상업적으로 재배포하는 행위

## 제8조 (제보)

1. 이용자는 제보에 개인정보를 적어서는 안 됩니다.
2. 제보는 운영자가 출처를 확인한 뒤 반영 여부를 정하며, 반영하지 않을 수도 있습니다.
3. 이용자는 서비스가 제보 내용을 콜라보 정보 작성·수정에 자유롭게 쓸 수 있도록 허락합니다. 링크된 원문의 권리는 원래 권리자에게 있습니다.

## 제9조 (지식재산권)

1. 서비스가 직접 작성한 정리·요약·분류·통계와 화면 구성에 대한 권리는 서비스에 있습니다. 출처를 밝히고 링크하는 방식의 인용과 비상업적 이용은 자유롭게 할 수 있습니다.
2. 게임·IP의 이름, 로고, 이미지 등 모든 지식재산권은 각 권리자에게 있으며, 서비스는 정보 제공 목적으로만 인용합니다. 권리자가 게시 중단을 원하면 아래 문의처로 알려 주세요.

## 제10조 (외부 링크)

서비스에는 공식 발표, 기사 등 외부 사이트 링크가 포함됩니다. 외부 사이트의 내용과 개인정보 처리는 각 사이트의 정책에 따르며, 서비스는 이에 책임지지 않습니다.

## 제11조 (책임의 제한)

1. 서비스는 무료로 제공되며, 천재지변, 외부 서비스(Discord, 호스팅 등)의 장애 등 서비스가 통제할 수 없는 사유로 생긴 손해에 책임지지 않습니다.
2. 서비스는 이용자가 서비스의 정보를 믿고 내린 결정으로 생긴 손해에 대해, 서비스의 고의나 중대한 과실이 없는 한 책임지지 않습니다.

## 제12조 (개인정보 보호)

서비스는 [개인정보 처리방침](/ko/privacy)에 따라 이용자의 개인정보를 보호합니다.

## 제13조 (준거법과 분쟁 해결)

이 약관은 대한민국 법률에 따르며, 서비스 이용으로 생긴 분쟁은 「민사소송법」에 따른 관할 법원에서 해결합니다.

## 문의

약관에 대한 문의는 ${reach}로 보내 주세요.
`;
}

function en({ email }: LegalContact): string {
  const reach = email ? `email [${email}](mailto:${email})` : 'the [Submit a collab](/en/report) page';
  return `## 1. Purpose

These Terms set out the conditions for using GameCollabs (“the Service”), a game collaboration information service, and the rights and obligations of the Service and its users.

## 2. Definitions

- A “user” is anyone who uses the Service under these Terms.
- A “member” is a user who signs in with a Discord account to use member features such as saves and follows.
- A “submission” is a link and note a user sends to tell us about a collab or an error.

## 3. Acceptance and changes

1. These Terms take effect when posted on the Service. By using the Service, you agree to them.
2. We may change these Terms within the limits of applicable law. We announce changes on this page and in the [changelog](/en/changelog) at least 7 days before they take effect, or 30 days before for changes that are unfavorable to users.
3. Members who don’t agree to the changes can delete their account. Continuing to use the Service after the effective date means you accept the changes.

## 4. The Service

1. The Service compiles collaborations between games and intellectual properties (anime, webtoons, films, characters, brands and more) from public sources and provides them free of charge.
2. Members can save collabs, follow properties and companies, and view a feed of what they follow.
3. We may change, suspend or end features for operational or technical reasons. As the Service is free, no compensation is provided for this.

## 5. Membership

1. You become a member by signing in with a Discord account. You must be at least 14 years old.
2. You can delete your account at any time from your [account](/en/account) page; your member information, saves and follows are deleted immediately.
3. We may restrict or delete an account without notice if the member breaches section 7.

## 6. Accuracy of information

1. We check public sources such as official announcements, news articles and official social posts, but we don’t guarantee that information is accurate, complete or current. Check the official announcements of each game and IP for dates, rewards and conditions.
2. The Service is not affiliated with or endorsed by any of the companies, games or IPs featured.
3. If you find an error, please use “Report issue” on the collab page.

## 7. Your obligations

You must not:

- submit false information, other people’s personal information, or illegal, obscene or hateful content
- send advertising or spam, or send submissions repeatedly by automated means
- scrape the Service in a way that puts excessive load on it, or bypass or interfere with its security measures
- use someone else’s account or interfere with the operation of the Service
- copy the Service’s information wholesale and redistribute it commercially without attribution

## 8. Submissions

1. Don’t include personal information in submissions.
2. An operator checks the sources and decides whether to use a submission; we may not use it.
3. You allow the Service to freely use the content of your submission to write and correct collab information. Rights to linked original content remain with their owners.

## 9. Intellectual property

1. The Service owns its own summaries, classifications, statistics and page design. You may quote and use them non-commercially with attribution and a link.
2. All names, logos, images and other intellectual property of games and IPs belong to their respective owners and are cited for informational purposes only. Rights holders who want something taken down can contact us as below.

## 10. External links

The Service links to external sites such as official announcements and articles. Their content and privacy practices are governed by their own policies, and we are not responsible for them.

## 11. Limitation of liability

1. The Service is provided free of charge. We are not liable for damage caused by events beyond our control, such as natural disasters or outages of third-party services (Discord, hosting and so on).
2. Unless caused by our intent or gross negligence, we are not liable for damage arising from decisions you make based on information on the Service.

## 12. Privacy

We protect your personal information as described in our [Privacy Policy](/en/privacy).

## 13. Governing law

These Terms are governed by the laws of the Republic of Korea. Disputes arising from use of the Service are resolved by the competent court under the Korean Civil Procedure Act.

## Contact

Send questions about these Terms to ${reach}.
`;
}

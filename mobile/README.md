# ビンボーマップ 모바일 앱

Expo(React Native + TypeScript) 기반. 타겟은 외식비가 부담되는 일본 20대 대학생.
**같은 코드가 iOS / Android / 웹 브라우저에서 모두 돌아갑니다.**

## 실행 방법 (개발)

```bash
cd mobile
npm install
npx expo start        # 폰(Expo Go)용 — QR코드 스캔
npx expo start --web  # 웹 브라우저에서 바로 열기
```

스마트폰에 **Expo Go** 앱을 설치하고 터미널의 QR코드를 스캔하면 실기기에서 바로 실행됩니다.

- **Android + Expo Go**: 구글맵·만보기 모두 동작 (Expo Go 내장 키 사용)
- **iOS + Expo Go**: 지도는 Apple 지도로 대체 표시됨. 구글맵을 iOS에서 쓰려면 development build 필요
- **웹**: 지도는 Leaflet + OpenStreetMap으로 자동 대체(`SpotMap.web.tsx`). 투고는 지도 **우클릭**. 만보기는 브라우저에 센서가 없어 비활성 안내가 표시되고, 로그인 보너스·투표·투고는 전부 동작
- **스토어 배포 시**: `app.json`의 `android.config.googleMaps.apiKey`에 [Google Cloud Console](https://console.cloud.google.com/)에서 발급한 Maps SDK for Android 키를 넣고 `eas build`로 빌드

### 웹 정적 배포 (Vercel/Netlify/GitHub Pages)

```bash
npx expo export --platform web   # dist/ 생성 → 그대로 정적 호스팅에 업로드
```

## 서버 연동 (Supabase)

스팟 데이터는 데이터 레이어(`src/lib/spotsRepo.ts`)를 통해 읽고 쓰며,
**환경변수가 있으면 서버 모드, 없으면 로컬 모드**로 자동 전환됩니다.

1. [supabase.com](https://supabase.com)에서 무료 프로젝트 생성
2. **Authentication → Sign In / Up → Anonymous Sign-Ins 활성화** (가입 없는 익명 인증)
3. SQL Editor에 [`/supabase/schema.sql`](../supabase/schema.sql) 내용을 붙여 실행
   (테이블 + RLS 보안정책 + 승인 큐 + 포인트 원장 등 전부 생성됨)
4. `mobile/.env.example`을 `mobile/.env`로 복사하고 Project Settings → API의
   URL과 anon key를 채움 → `npx expo start` 재시작

서버 모드에서의 동작:
- 지도는 **승인된(approved) 스팟만** 표시 (`spots_public` 뷰)
- 투고는 `status=pending`으로 저장 → 대시보드 Table Editor에서 `approved`로 바꾸면 공개
  (거지맵과 같은 승인제)
- 투표/별점/댓글/마켓/추첨 테이블과 정책도 스키마에 준비되어 있고, 화면 연결은 다음 단계
- 포인트는 잔액 컬럼이 아니라 **원장(points_ledger) 합산** 구조 — 부정 적립 검증을
  Edge Function으로 넣기 위한 설계. 기프트코드 에스크로도 평문 저장 금지를 스키마에 명시

## 검증 명령

```bash
npm test            # 포인트 로직 단위 테스트 (node:test)
npm run typecheck   # tsc --noEmit
```

## 화면 구성

```
App.tsx                     # 헤더(포인트 잔액) + 2탭 전환
src/screens/MapScreen.tsx   # 필터 칩, 투고 모달, 즐겨찾기 필터, 싼 순 리스트, 현재위치
src/components/SpotMap.tsx      # 네이티브용 지도 (react-native-maps / 구글맵) — 가격 pill 마커
src/components/SpotMap.web.tsx  # 웹용 지도 (Leaflet + OpenStreetMap) — 동일 pill 마커
src/components/SpotDetailSheet.tsx  # 가게 상세 바텀시트: 별점·댓글·즐겨찾기·외부지도 열기
src/lib/spotUtils.ts        # SpotMap 공용 코드 (주의: .web.tsx에서 "./SpotMap" import는
                            #   플랫폼 해석 때문에 자기 자신을 가리킴 → 공용 코드는 여기로)
src/screens/WalkScreen.tsx  # 만보기: 오늘 걸음수, 포인트 수령, 로그인 보너스
src/screens/GuideScreen.tsx # 절약 가이드: 검색 + 카테고리 필터 + 기사 + 이해도 퀴즈(+5pt)
src/data/guides.ts          # 교육 콘텐츠 10편 (일본어, 세금/연금/광열비/통신/주거/장학금)
src/screens/GiftScreen.tsx  # 교환소(B2C): 운영자 쿠폰 교환 + チリツモ抽選 (C2C 없음)
src/data/coupons.ts         # 쿠폰 카탈로그 (브랜드 제휴 전 데모)
src/context/AccountContext.tsx / src/components/LoginModal.tsx  # 로그인 게이트
src/hooks/useSteps.ts       # expo-sensors Pedometer 래퍼 (iOS/Android 분기)
src/lib/points.ts           # 포인트 규칙 (순수 함수, 테스트 대상)
src/lib/storage.ts          # AsyncStorage 래퍼
src/context/PointsContext.tsx
src/data/spots.ts           # 도쿄 샘플 스팟 15곳 (데모용 개략 좌표)
```

## 포인트(チリツモ) 경제 설계 (`src/lib/points.ts`에서 조정 가능)

**원칙: 포인트는 광고·어필리에이트 수익의 분배** (거지맵 방식). 무재원 지급은 소액으로 억제.

- **광고 시청**: +20pt × 1일 3회 = 최대 60pt — **가장 큰 지급원** (현재 데모 모달,
  본번은 AdMob 등 리워드 광고 SDK + 서버 지급 검증으로 교체)
- **만보기 구간보상**: 2,000/5,000/8,000/10,000보 각 +10pt (1일 최대 40pt)
- **출석** +5 / **룰렛** 최대 20 / **보물상자** +1~5 / **퀴즈** 기사당 +5
- **소비처**: 운영자 쿠폰 교환(600~2,500pt) / 추첨 응모(80~100pt) — 확정 교환은 비싸게,
  추첨은 싸게(지급 비용이 확률로 캡핑되는 거지맵 구조)
- **로그인 게이트**: 수령·사용은 닉네임 등록 필수(`AccountContext`). 익명 열람·투고는 유지.
  서버 대응 후 LINE/Apple 로그인으로 승격 예정
- 잔액·수령 이력은 AsyncStorage(단말 로컬). 실제 쿠폰 발권·추첨은 서버 대응 후
  (경품 제공은 일본 景品表示法 확인 필요)

### 만보기 플랫폼 차이 (MVP 한계)

- **iOS**: HealthKit 경유 `getStepCountAsync`로 0시부터의 걸음수를 정확히 취득
- **Android**: 조회 API가 없어 `watchStepCount`(구독 시점부터 증분)를 날짜별로 적산 → **앱 실행 중에만 계측됨**. 백그라운드 계측은 추후 Health Connect 연동으로 해결 예정

## 일본 보급 전략에 맞춘 설계 결정

- **커뮤니티 없음**: 게시판·채팅 제거. 지도 + 포인트에 집중
- **회원가입 없음**: 일본 유저는 가입 장벽에 민감 → 익명으로 즉시 사용
- **ポイ活 결합**: 트리마(トリマ)·aruku& 등 걷기 포인트 앱이 일본에서 수천만 DL → 만보기 포인트가 리텐션 축
- **포인트 사용처(추후)**: 제휴 가게 쿠폰 교환이 자연스러운 수익 모델

## 다음 단계 로드맵

1. 스팟/투표 서버 저장 (Supabase 등) + 투고 승인 큐
2. Android 백그라운드 걸음수 (Health Connect / Google Fit)
3. 현재지 주변 검색·정렬, 마커 클러스터링
4. 포인트 사용처 (쿠폰/추첨 — 경품표시법(景品表示法) 검토 필요)
5. 스토어 배포: EAS Build → App Store / Google Play

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
src/screens/GiftScreen.tsx  # 기프트권 마켓: 포인트 판매/물물교환, 출품, 코드 기재 차단
src/data/gifts.ts           # 기프트 브랜드 8종 + 샘플 출품 (본번은 서버 + 에스크로 필수)
src/hooks/useSteps.ts       # expo-sensors Pedometer 래퍼 (iOS/Android 분기)
src/lib/points.ts           # 포인트 규칙 (순수 함수, 테스트 대상)
src/lib/storage.ts          # AsyncStorage 래퍼
src/context/PointsContext.tsx
src/data/spots.ts           # 도쿄 샘플 스팟 15곳 (데모용 개략 좌표)
```

## 포인트(チリツモ) 규칙

- 1,000보마다 **10pt**, 1일 **1만보**까지 환산 (`src/lib/points.ts`에서 조정 가능)
- 로그인 보너스 1일 1회 **+5pt**
- 잔액·수령 이력은 AsyncStorage(단말 로컬)에 저장

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

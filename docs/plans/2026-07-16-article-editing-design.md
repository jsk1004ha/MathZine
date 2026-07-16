# 기사 수정 기능 설계

## 목표

기존 스튜디오 작성 경험을 그대로 사용해 작성자가 자기 기사를, 어드민이 모든 기사를 수정할 수 있게 한다.

## 사용자 흐름

- 기사 페이지의 권한 사용자에게 `기사 수정` 버튼을 표시한다.
- 스튜디오의 기사 목록에는 읽기와 수정 진입점을 함께 제공한다.
- `/studio?edit=<slug>`는 기존 원고를 폼에 채우고 수정 모드 문구를 표시한다.
- 저장 성공 뒤 기존 기사 URL로 이동한다.

## 권한과 데이터 보존

- reporter는 `authorId`가 자기 계정인 기사만 수정한다.
- admin은 모든 기사를 수정한다.
- slug, id, author, status, publishedAt, views, likes, linked problems는 유지한다.
- 제목, 부제, 섹션, 태그, 호수, 읽기 시간, 본문, excerpt, pull quote, content, updatedAt만 갱신한다.
- 공개된 기사도 공개 상태를 유지한 채 수정한다.

## 구현

- `canEditArticle` 권한 함수를 추가해 페이지와 저장 계층이 같은 규칙을 사용한다.
- `updateArticle` 도메인 함수를 추가하고 생성과 같은 문서 검증·정제를 재사용한다.
- `PATCH /api/articles/[slug]`에서 인증, rate limit, 감사 로그를 처리한다.
- `StudioForm`은 `initialArticle`과 `editingSlug`를 받아 POST/PATCH를 선택한다.
- 신규 원고 임시저장과 수정 원고 임시저장은 키를 분리해 서로 덮어쓰지 않는다.

## 검증

- 작성자 수정 성공, 타인 수정 거부, 어드민 수정 성공을 회귀 테스트로 고정한다.
- 수정 뒤 기사 불변 필드와 반응 데이터가 유지되는지 검증한다.
- lint, 콘텐츠 회귀 테스트, 프로덕션 빌드, 브라우저 흐름을 확인한다.

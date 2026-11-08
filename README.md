# 광고 세팅 요청 웹사이트

마케터들이 메타·구글·틱톡 광고 세팅 요청을 제출하면 매체별로 기존 Notion 데이터베이스에 행을 생성합니다.

## Render 배포
- New > Web Service > GitHub 저장소 `ad-request-notion` 선택
- Build command: `npm install`
- Start command: `npm start`
- Environment: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `TEAM_PASSWORD` 설정
- Notion 통합에 대상 데이터베이스 연결 권한 부여

## 주의
- Notion 토큰은 GitHub에 올리지 마세요.
- 서버는 배포 후 실제 Notion API 요청과 파일 첨부를 테스트해야 합니다.
- 현재 팀 비밀번호 방식은 간단한 접근 제한이며, 조직 전체 운영 전 별도 사용자 인증과 보안 검토가 권장됩니다.

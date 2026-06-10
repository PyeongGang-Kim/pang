# AGENTS.md

This file provides guidance to AI agents (Claude Code, Cursor, Copilot 등) when working with code in this repository.

---

## 문서 구조

| 파일 | 내용 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 게임 전체 개요 및 핵심 메커니즘 |
| [docs/FEATURES/main.md](docs/FEATURES/main.md) | 메인 화면 구성 및 상태 전환 |
| [docs/FEATURES/game_rule.md](docs/FEATURES/game_rule.md) | 플레이어 조작, 볼 분열, 파워업, 점수 시스템 등 게임 룰 상세 |
| [docs/FEATURES/mission1.md](docs/FEATURES/mission1.md) | Mission 1 스테이지 구성, 난이도 규칙, 클리어 조건 |

---

## 구현 시 참고 사항

- 새로운 기능을 구현하기 전에 `docs/FEATURES/` 아래의 해당 문서를 먼저 확인한다.
- 게임 룰 변경이 필요한 경우 코드 수정과 함께 관련 문서도 업데이트한다.
- Mission 추가 시 `docs/FEATURES/` 아래에 `mission{N}.md` 파일을 생성한다.

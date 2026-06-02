# vibekitvn

> Bộ skill AI tiếng Việt cho 23 AI IDE (Claude Code, Cursor, Windsurf, Gemini, Kilo, Roo, Cline, Codex, ...)

```bash
npx vibekitvn activate VBK-COMBO-XXXX-YYYY-ZZZZ
```

`vibekitvn@2.1.10` · Node >=20 · ESM. CLI này **không chứa nội dung skill** — nó activate license, tải tarball skill đã ký (signed) về cache, watermark, rồi copy skill vào thư mục IDE.

## Mua license

Mua key qua Telegram bot: **[@vibekitvn_bot](https://t.me/vibekitvn_bot)**

| Tier | Giá | Mô tả |
|---|---|---|
| **Combo** | 999K | Khuyến nghị — 57 skill + bonus pack + free update vĩnh viễn, 2 máy |
| Standard | 499K | 57 skill + docs + free update 1.x, 2 máy |
| Enterprise | Quote | Multi-team, on-prem mirror, SLA — liên hệ @tiensinhcc |

[Refund policy](#refund-policy): 7 ngày money-back nếu chưa activate.

## Cách dùng

### 1. Cài CLI

```bash
npm install -g vibekitvn
# hoặc dùng npx (không cần install)
npx vibekitvn --help
```

### 2. Activate license

```bash
vibekitvn activate VBK-COMBO-XXXX-YYYY-ZZZZ
```

CLI sẽ:
- Verify license với server (`POST /api/license/verify`), bind máy (max 2 máy/key)
- Tải skill content (signed URL, verify SHA256) về cache máy `~/.vibekitvn/bundle/`
- Watermark mỗi file `.md` (HMAC theo license — chống leak)
- Auto-sync skill vào IDE: TTY mở installer tương tác, headless cài "preferred" (Claude Code + Cursor)

Dùng `--no-sync` để chỉ tải về, không cài vào IDE.

### 3. Dùng trong AI IDE

Mở project trong Cursor / Claude Code / Windsurf / Kilo..., gõ trong AI chat:

```
@vibekit-dong-nao
@vibekit-tao-prd
@vibekit-trien-khai-len-mang
```

## Commands

| Lệnh | Mô tả |
|---|---|
| `vibekitvn activate <KEY>` | Activate máy + tải skill vào cache `~/.vibekitvn/bundle/` |
| `vibekitvn install` | Cài skill vào project hiện tại từ cache (dùng nhiều project) |
| `vibekitvn uninstall` | Xóa skill khỏi project (giữ lại output folder) |
| `vibekitvn status` | Show license info + danh sách máy đã bind |
| `vibekitvn deactivate` | Giải phóng slot máy hiện tại (cooldown 90 ngày) |
| `vibekitvn update` | Tải skill content mới nhất (khác với version CLI trên npm) |
| `vibekitvn buy` | In link Telegram bot để mua |
| `vibekitvn tro-giup` | Hiện danh sách `@vibekit-*` + tạo note trong project |

## Trạng thái lưu ở đâu

- `~/.vibekitvn/license.json` — file state duy nhất: `{license_key, machine_id, activated_at, version}` (plaintext, chưa mã hóa)
- `~/.vibekitvn/bundle/` — cache skill đã tải (`skills/`, `modules/`, `platforms.yaml`, `manifest.json`)
- `_vibekitvn/` (trong project) — bản copy skill + config khi `install`
- `_vibekitvn-output/` (trong project) — nơi AI ghi tài liệu sinh ra
- IDE target dir (vd `.claude/skills/`) — skill folder; với Claude Code còn cài hook `PostToolUse` log session local

## Skills bao gồm (57)

- **Core (11):** trợ giúp, động não, chế độ nhóm, chưng cất, biên tập, đánh giá phản biện, danh mục tài liệu, ...
- **Analysis (8):** PRFAQ, tài liệu dự án, nghiên cứu thị trường/lĩnh vực/kỹ thuật, ...
- **Plan (9):** tạo PRD, kiểm tra/chỉnh sửa PRD, thiết kế UX/mockup, agent quản lý dự án, ...
- **Solutioning (5):** tạo kiến trúc, epics & stories, ngữ cảnh dự án, kiểm tra sẵn sàng triển khai
- **Implementation (20):** phát triển story, đánh giá mã nguồn, gỡ rối, triển khai lên mạng, tích hợp database/auth/AI, ...
- **Marketing (4):** video UGC, video marketing, infographic, pitch deck

## AI IDE supported (23)

Claude Code, Cursor, Windsurf, Gemini, GitHub Copilot, Kilo, Roo, Cline, Codex, Junie, Trae, Qwen, iFlow, Antigravity, Auggie, CodeBuddy, Crush, Kiro, Ona, OpenCode, Pi, Qoder, Rovo Dev.

> Danh sách & target_dir đầy đủ nằm trong `platforms.yaml` **bên trong tarball tải về** (`~/.vibekitvn/bundle/platforms.yaml`), không nằm trong package npm này.

## Network calls

Tất cả gọi tới `https://vibekit-vn.vercel.app` (override bằng env `VIBEKITVN_API_URL`):

| Endpoint | Khi nào | Payload |
|---|---|---|
| `POST /api/license/verify` | activate | `{license_key, machine_id, hostname, platform, cli_version}` |
| `POST /api/license/status` | status | `{license_key, machine_id, cli_version}` |
| `POST /api/license/deactivate` | deactivate | `{license_key, machine_id}` |
| `POST /api/release/latest` | update | `{license_key, machine_id, cli_version}` |
| `GET <download_url>` | tải tarball | URL signed do server cấp |

## Privacy

Gửi tới server: license key (bạn cung cấp); machine fingerprint (SHA256 của salt + hostname + username + platform + arch + CPU model + HOME path → 16 hex, **không reverse được**); hostname + platform (chỉ khi verify); cli_version; IP (rate limit/abuse).

**KHÔNG gửi**: file content, nội dung AI chat, usage metric, session.log, giá trị watermark, arch. Mọi network call đều do người dùng chủ động chạy lệnh — không có call nền/analytics.

## Refund policy

- **Trong 7 ngày**: refund 100% nếu chưa activate hoặc activate < 3 ngày
- **Sau 7 ngày**: no refund
- Refund qua chuyển khoản trong 1-3 ngày làm việc — liên hệ @vibekitvn_bot → /support

## Support

- Telegram: [@vibekitvn_bot](https://t.me/vibekitvn_bot) → `/support`
- Issues kỹ thuật: gửi qua bot, không qua GitHub Issues (repo này chỉ là CLI loader)

## License

Proprietary — see [LICENSE.md](./LICENSE.md). Mua qua [@vibekitvn_bot](https://t.me/vibekitvn_bot).

---

Made with love in Vietnam by Cuongunder ([@tiensinhcc](https://t.me/tiensinhcc)).

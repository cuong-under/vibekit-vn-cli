# vibekit-vn

> 🇻🇳 Bộ skill AI tiếng Việt cho 23 AI IDE (Claude Code, Cursor, Windsurf, Gemini, …)

```bash
npx vibekit-vn activate VBK-LIFETIME-XXXX-YYYY-ZZZZ
```

## Mua license

**999.000đ / lifetime — 2 máy, free update 1.x**

Mua key qua Telegram bot: **[@vibekitvn_bot](https://t.me/vibekitvn_bot)**

| Tier | Giá | Mô tả |
|---|---|---|
| Lifetime | 999K | Public default — 2 máy, free update 1.x |
| Founding | 499K | 50 slot đầu — 2 máy, free update 1.x + 2.x lifetime |
| Enterprise | Quote | Multi-team, on-prem mirror, SLA — liên hệ @cuongunder |

[Refund policy](#refund-policy): 7 ngày money-back nếu chưa activate.

## Cách dùng

### 1. Cài CLI

```bash
npm install -g vibekit-vn
# hoặc dùng npx (không cần install)
npx vibekit-vn --help
```

### 2. Activate license

```bash
vibekit-vn activate VBK-LIFETIME-XXXX-YYYY-ZZZZ
```

CLI sẽ:
- Verify license với server
- Bind máy của bạn (max 2 máy/key)
- Tải skill content (~5MB) về `_vibekitvn/skills/`
- Sync skill vào AI IDE phát hiện được (`.claude/`, `.cursor/`, `.windsurf/`, …)

### 3. Dùng trong AI IDE

Mở project trong Cursor / Claude Code / Windsurf, gõ trong AI chat:

```
@vibekit-dong-nao
@vibekit-tao-prd
@vibekit-trien-khai-len-mang
```

→ AI tự đọc skill + thực thi.

## Commands

| Lệnh | Mô tả |
|---|---|
| `vibekit-vn activate <KEY>` | Activate license + tải skill |
| `vibekit-vn install` | Sync skill từ `_vibekitvn/` vào AI IDE (sau khi activate) |
| `vibekit-vn uninstall` | Xóa skill khỏi project |
| `vibekit-vn status` | Show license info + machine count |
| `vibekit-vn deactivate` | Giải phóng slot máy hiện tại (cooldown 90 ngày) |
| `vibekit-vn update` | Tải skill version mới nhất |
| `vibekit-vn buy` | Mở Telegram bot để mua |

## Skills bao gồm

46 skill chia 5 module:

- **Core (11):** trợ giúp, động não, chế độ nhóm, chưng cất, biên tập, đánh giá, danh mục tài liệu, …
- **Analysis (8):** PRFAQ, tài liệu dự án, nghiên cứu thị trường/lĩnh vực/kỹ thuật, agent CuongBA, …
- **Plan (6):** tạo PRD, kiểm tra PRD, tạo thiết kế UX, agent CuongPM, …
- **Solutioning (5):** tạo kiến trúc, tạo epics & stories, kiểm tra sẵn sàng triển khai, agent CuongArch
- **Implementation (16):** phát triển story, đánh giá mã nguồn, **gỡ rối, triển khai lên mạng, tích hợp database, tích hợp auth, tích hợp AI**, …

## AI IDE supported

23 platform — bao gồm Claude Code, Cursor, Windsurf, Gemini CLI, GitHub Copilot, Kilo, Roo, Cline, Codex, … (xem `platforms.yaml`).

## Privacy

CLI gửi tới license server các thông tin sau khi activate:
- License key (bạn cung cấp)
- Machine fingerprint (SHA256 của hostname + username + platform + CPU model — anonymous, không reverse được)
- Hostname + platform (debugging)
- IP (rate limit + abuse detection)

KHÔNG gửi:
- File content của bạn
- Nội dung AI chat
- Metric usage

## Refund policy

- **Trong 7 ngày**: refund 100% nếu chưa activate hoặc activate < 3 ngày
- **Sau 7 ngày**: no refund
- Refund qua chuyển khoản ngân hàng trong 1-3 ngày làm việc
- Liên hệ refund: @vibekitvn_bot → /support

## Support

- Telegram: [@vibekitvn_bot](https://t.me/vibekitvn_bot) → `/support`
- Issues kỹ thuật: gửi qua bot, không qua GitHub Issues (repo này chỉ là CLI loader)

## License

Proprietary — see [LICENSE.md](./LICENSE.md). Mua qua [@vibekitvn_bot](https://t.me/vibekitvn_bot).

---

Made with ❤️ in Vietnam by @cuongunder.

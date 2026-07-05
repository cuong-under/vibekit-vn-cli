# AGENTS.md — vibekit-vn-cli (public npm `vibekitvn`)

> Bộ nhớ kỹ thuật sâu cho repo này. Đọc cùng `../AGENTS.md`. Cập nhật: 2026-05-31.

## Vai trò

CLI public trên npm, `vibekitvn@2.1.11`, Node 20 ESM. **Loader/installer thuần** — KHÔNG chứa nội dung skill. Nhiệm vụ: activate license → tải tarball signed → verify sha256 → watermark → copy skill vào IDE. Deps (5): `@clack/prompts`, `commander`, `js-yaml`, `picocolors`, `tar`.

## Layout

```
bin/vibekitvn-cli.js        # entry, commander, lazy import handler
lib/
  api.js                    # HTTP client (base https://vibekit-vn.vercel.app)
  download.js               # fetch + sha256 verify + tar extract + atomic swap
  machine-fingerprint.js    # machine_id
  license-file.js           # ~/.vibekitvn/license.json
  license-mask.js  watermark.js  package-info.js
  commands/{activate,install,install-full,uninstall-full,status,deactivate,update,misc,help-note}.js
  installer/{paths,platforms,platform-installer,skill-discovery,config-generator,config-loader,state-detector,project-bundle,path-utils,file-ops,ui}.js
  hooks/post-tool-use.js    # Claude Code PostToolUse logger (local)
test/*.test.js              # 5 file (chỉ pure logic)
```

## Commands (bin/vibekitvn-cli.js, commander, lazy import)

`activate [key] --no-sync`, `install` (nhiều flag), `status`, `deactivate`, `update`, `uninstall`, `buy`, `tro-giup` (alias `tro-gio`, `help`).

## Activate flow (lib/commands/activate.js)

1. Validate key regex `/^VBK-(LIFETIME|FOUNDING|ENT|V2|STANDARD|COMBO)-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/i`, uppercase.
2. `getMachineMetadata()` → {machine_id, hostname, platform, arch}.
3. `POST /api/license/verify` (bind máy server-side, max 2). Lỗi map qua `formatVerifyError`: INVALID_KEY_FORMAT, KEY_NOT_FOUND, REVOKED, REFUNDED, MAX_MACHINES, RATE_LIMITED, CLI_TOO_OLD, LICENSE_EXPIRED.
4. Ghi `~/.vibekitvn/license.json`.
5. `downloadAndExtract({url: download_url, sha256, destDir: ~/.vibekitvn/bundle})`.
6. **Rollback nếu download lỗi**: deactivate + delete license (không burn slot).
7. `applyWatermark` (best-effort).
8. Auto-install: `--no-sync` dừng; TTY → installer tương tác; headless → `syncSkills(preferred)`.

## Machine fingerprint (lib/machine-fingerprint.js)

`sha256("vibekit-vn-machine-fp-v1|" + hostname|username|platform|arch|cpu0.model|HOME)[:16]` (16 hex = 64-bit, một chiều). Gửi server: machine_id (hash) + hostname/platform RAW (chỉ khi verify). KHÔNG gửi arch.

## Download (lib/download.js)

`fetch` timeout 60s, stream ra temp + tính sha256. Mismatch → throw `SHA256_MISMATCH` (KHÔNG retry). Transient → retry 3 lần backoff. Extract tar vào staging → `validateBundle` (cần `skills/` + `manifest.json`) → atomic rename swap + backup `.bak-<ts>`.

## Install / IDE (KHÔNG auto-scan filesystem)

Driven bởi `platforms.yaml` trong bundle (KHÔNG có trong package npm — entry `files` là vestigial). `installSkillsForPlatform` copy nguyên skill folder vào `<project>/<target_dir>/<skill.id>`, KHÔNG transform format. Khác biệt IDE = đường dẫn `target_dir`. `--tools all|preferred|none|<csv>`. `preferred` = claude-code + cursor. Khi có claude-code: cài hook `.claude/hooks/post-tool-use.js` + đăng ký matcher `Write|Edit|Bash|NotebookEdit` trong `.claude/settings.json`.

## State trên máy user

- `~/.vibekitvn/license.json` — `{license_key, machine_id, activated_at, version}` PLAINTEXT (chưa mã hóa). Legacy fallback `./.vibekitvn-license`.
- `~/.vibekitvn/bundle/` — cache skill (`skills/`, `modules/`, `platforms.yaml`, `manifest.json`).
- project `_vibekitvn/` (copy skill+config), `_vibekitvn-output/` (AI ghi docs).
- `ensureGitignore` thêm `.vibekitvn-license`, `_vibekitvn/`, `_vibekitvn-output/`.
- hook ghi `<output>/planning-artifacts/session.log` JSONL (cap 500 dòng) — LOCAL, không gửi đi.

## Watermark (lib/watermark.js — chống leak)

Mỗi `.md`: comment EOF `<!-- vbk-wm: <sha256(key)[:16]> · <HMAC-SHA256(key, relpath)[:8]> -->`. Path-bound (rename/xóa 1 phần vẫn truy được). Ghi `manifest.json.watermark` + `.watermark.json`. **Raw key KHÔNG bao giờ nhúng** — chỉ fingerprint/HMAC. `readWatermarks` để vendor truy ngược.

## Network (lib/api.js — base override `VIBEKITVN_API_URL`)

`POST /api/license/verify` (activate), `/status`, `/deactivate`, `/release/latest` (update); `GET <download_url>` (tarball). User-Agent `vibekit-vn-cli/<v>`, timeout 30s. Lỗi mạng trả `{status:0, code:NETWORK_ERROR|REQUEST_TIMEOUT}`.

## Privacy

Gửi: license key, machine_id (hash), hostname+platform (chỉ verify), cli_version, IP (implicit). KHÔNG gửi: file content, AI chat, metric, session.log, watermark, arch. Mọi call do user chủ động chạy lệnh.

## Gốc lưu ý

- Test chỉ cover pure logic (fingerprint, license-file, mask, path-utils, watermark) — KHÔNG cover api/download/installer.
- `.vercel/` gitignored, link project `vibekit-vn-cli`.
- Phân biệt 2 version: CLI version (npm) vs content version (tarball, lệnh `update`).

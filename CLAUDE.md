# CLAUDE.md

## 專案概述

著色圖魔法屋 — 將彩色圖片轉換為黑白線稿著色圖的 Next.js 應用程式。

## 技術棧

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Google Noto Sans TC 字體（400/700/900）
- 部署在 Vercel 免費方案

## 開發指令

- `npm run dev` — 啟動開發伺服器
- `npm run build` — 生產建構
- `npx tsc --noEmit` — 型別檢查

## 架構重點

- 所有圖片處理在瀏覽器端 Canvas API 完成，零伺服器運算
- 唯一的 API Route 是 `/api/fetch-image`，代理抓取外部圖片 URL 避免 CORS
- 單頁式設計：上傳區永遠可見，上傳後自動轉換，結果顯示在下方

## 轉換演算法（src/lib/image-to-lineart.ts）

核心策略是「提取原圖已有的黑色線條」而非邊緣偵測：
1. 去背（透明像素→白色 + 邊緣 flood-fill）
2. 輪廓提取（絕對暗色 + 4 軸方向對比偵測，需 ≥2 軸匹配）
3. 膨脹連接斷線
4. BFS 挖空大面積填充區
5. 降噪 + 抗鋸齒

## 視覺風格

溫馨童趣風：暖橘漸層 (#ffecd2→#fcb69f)、奶油白底 (#fffdf7)、大圓角、膠囊按鈕。

## 版本管理

- 上 git tag 時，必須同步更新 `package.json` 的 `version` 欄位，確保兩者一致
- 網頁開啟時會在 console 印出版號（來源：`package.json` version），透過 `src/components/VersionLog.tsx`

## 注意事項

- 演算法參數經過多輪調校，修改前請用 refs/ 下的測試圖片驗證
- 透明 PNG 的 RGB 可能是 (0,0,0,0)，必須先轉白色再處理
- 方向對比偵測要求 ≥2 軸匹配以避免假邊緣
- 下載檔名格式：`{原檔名}-coloring.png`

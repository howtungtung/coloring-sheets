# 著色圖魔法屋

將彩色圖片轉換為黑白線稿著色圖的線上工具，專為家長和老師設計。

## 功能

- **圖片上傳**：拖曳、點擊選擇檔案、貼上圖片 URL
- **自動轉換**：上傳後自動產生黑白線稿著色圖
- **下載 PNG**：一鍵下載轉換後的著色圖（檔名為 `原檔名-coloring.png`）
- **列印**：直接開啟瀏覽器列印對話框

## 技術棧

- **框架**：Next.js (App Router)
- **語言**：TypeScript
- **樣式**：Tailwind CSS
- **字體**：Google Noto Sans TC
- **部署**：Vercel

## 轉換演算法

所有圖片處理在瀏覽器端完成，不上傳任何資料到伺服器：

1. **去背**：將透明像素設為白色，從邊緣 flood-fill 移除白色背景
2. **輪廓提取**：偵測絕對暗色像素（亮度 < 120）+ 方向對比偵測（4 軸方向，需 2+ 軸匹配），提取原圖的黑色線條
3. **膨脹連接**：3x3 十字膨脹修補斷裂線段
4. **挖空填充**：BFS 計算邊界距離，將大面積黑色區塊內部挖空成輪廓線
5. **降噪**：flood-fill 移除小型孤立雜訊
6. **抗鋸齒**：3x3 平均模糊 + 重新二值化，平滑線條邊緣

## 開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

## 建構與部署

```bash
npm run build
npx vercel --yes
```

## 專案結構

```
src/
├── app/
│   ├── layout.tsx              # 根佈局、Noto Sans TC 字體
│   ├── page.tsx                # 主頁面（單頁式，上傳即轉換）
│   └── api/fetch-image/
│       └── route.ts            # 代理抓取外部圖片 URL（避免 CORS）
├── components/
│   ├── ImageUploader.tsx        # 上傳區（拖曳 + 檔案 + URL）
│   ├── ImagePreview.tsx         # 原圖/線稿並排預覽
│   └── ActionButtons.tsx        # 下載/列印按鈕
└── lib/
    └── image-to-lineart.ts     # 線稿轉換核心演算法
```

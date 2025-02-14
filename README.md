# POC-HTTP-Range-Video
a simple http range video streaming project

## 啟動專案
```
npm i
npx ts-node src/server.ts
```
接著打開 http://localhost:3000/ 即可

## 什麼是 HTTP range requests?
其實 MDN 寫得很清楚了，可參考 [MDN - Range_requests](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Range_requests)

HTTP Range Requests 是一種讓 Client 端只請求檔案一部分，而不是整個檔案的機制。可以使用在影片播放、檔案下載、續傳等傳輸情境中。

當 Client 端，如瀏覽器的 `<video>` 標籤需要下載影片時，它不會一次下載整個檔案，而是：

1. Client 請求影片的一部分片段。
2. Server 回應該片段內容，而不是回應整部影片檔。
3. 當用戶跳轉影片的時間軸時， Client 會重新請求新的片段。

### HTTP Range Requests 工作流程

#### 一、Client 發送 Header 帶有 Range 的 Request 請求

例如 Header 上的 Range 為：

```
bytes=0-999999
```

#### 二、Server 接收 Header Range

當 Server 接收到請求時，從該請求的 Header Range 得知 bytes 範圍，理解 Client 需要這個影片的前 1MB 內容（即 0 到 999,999 bytes）

#### 三、Server 返回該影片或檔案的指定 chunk 內容

接著 Server 可以將指定影片或檔案的大小分段，返回前 1MB 內容，而不是返回完整的影片或檔案（HTTP Status 為 206 Partial Content）

#### 四、Client 發送 Header 帶有其他 Range 數值的的新 Request 請求

當 Client 取得該檔案或播放該影片片段後，繼續向 Server 發出下一次請求，這次 Header Range 帶有新的 bytes 範圍，後續 Server 可以回傳新的對應內容，以此類推。

### 使用 Range Requests 的優點

- 支援跳轉：Client 可以跳過已播放部分，只請求新段落，Server 認 Header Range bytes 範圍，Client 要哪裡我就給哪裡。
- 減少流量：只請求下載當前播放的部分，避免一次下載完整檔案，若影片很大，分段串流下載的優勢就出來了。
- 支援續傳：請求中斷後，可以從中斷點繼續請求，而不是重新開始播放，因為 Server 認 Header Range bytes 範圍，只要 Client 還記得 bytes 範圍，Server 就能繼續回傳對應內容。
- 改善使用者體驗：影片可以即時開始播放，而不是等待整部影片載入。
 
## HTTP 200 vs. HTTP 206 vs. HTTP 416

### HTTP 200

當 Client 發送請求，但沒有 Range Header，Server 會回傳完整的資源。

- 影片資源會完整下載，而不是逐步加載，這導致大量流量消耗：如果影片太大餅且使用者網路太差，會有很糟糕的體驗。
- 跳轉無效，因為 Client 瀏覽器無法針對某個影片片段單獨請求。

### HTTP 206

當 Client 發送 Range Header 請求檔案的部分內容時，Server 會回應 206 Partial Content，並只回傳請求的區段。

- 影片可以逐步下載，不會一次載入完整影片，減少流量，使用者的體驗也會比較好。
- 支援跳轉時間片斷，瀏覽器可根據播放進度發送新的 Range Requests 來載入不同片段。

### HTTP 406

當 Client 請求的 Range 超出了檔案大小範圍，Server 無法回應該區段就會回傳 416。

- 影片播放失敗，因為瀏覽器請求了一個不存在的區段。
- 某些播放器可能會自動重新請求正確範圍，但如果 Server 處理不當，可能導致播放錯誤。

## HTTP range requests vs HLS


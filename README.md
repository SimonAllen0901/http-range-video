# POC-HTTP-Range-Video
a simple http range video streaming project

## 啟動專案
```
npm i
npx ts-node src/server.ts
```
接著打開 http://localhost:3000/ 即可

## 什麼是 HTTP range requests？
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

## 什麼是 HLS？
請看筆者以前寫的 [ithome 鐵人賽文章](https://ithelp.ithome.com.tw/m/articles/10203792)，這裡不多贅述。

## HTTP range requests vs HLS

HTTP Range Requests 和 HLS 都能片段式、逐個 request 請求播放影片，而不用一次請求完整影音檔案，但它們的 Cache 機制、對 Server 負擔和適合的應用情境還是略有不同。

### 傳輸方式

* HTTP Range Requests 使用 `Range: bytes=...` request MP4 片段
* HLS 會將影片預先切成數個 `.ts` 片段並用 `.m3u8` 這個文件管理

### CDN Cache

* HTTP Range Requests 雖然可以也可以 CDN Cache，但難度較大，因為每個使用者請求的 `Range: bytes=...` 範圍片段是變動的，除非有其他使用者剛好請求了一樣的 Range 片段，否則又會向 Server 要一段動態計算的片段，當使用者量大時，大量不同的 Requests 又要即時計算影片片段，這對 Server Run Time 的 IO 負擔會增加很多。
* HLS 會按照設定的格式，例如固定多少秒作為一個 ts 片段，將影片切成大量 `.ts` 片段。由於 `.ts` 檔格式影長都是固定的，Server 不用動態去算使用者的片段範圍，所以固定的 ts 可以很容易被 CDN Cache。

### 自適性串流 (Adaptive bitrate streaming)

* HTTP Range Requests 不支援，只能固定播放某個解析度。
* HLS 支援，可以隨著使用者設備網路大小，動態切換不同解析度影片(ex: 360p、720p、1080p)。

### Server 負擔

* HTTP Range Requests 對 Server 負擔較高，由於 Range 動態影音片段不容易被 CDN Cache，Server 會需要頻繁 IO 讀取並計算、回傳不同影片區段。
* HLS 對 Server 負擔相對低，因為只傳固定時間範圍的 `.ts` 片段，CDN 可以 Cache。

### 跳轉（使用者在播放器時間軸跳轉特定時間位置）

* HTTP Range Requests 可以，根續使用者請求的 `Range: bytes=...` 來取得跳轉新時間為置的影音片段。
* HLS 可以，根據跳轉的時間位置，透過 `m3u8` 內紀錄的 ts 去取得對應的 `.ts` 片段。

### 播放體驗

* HTTP Range Requests 可能慢，取決於 Server 回傳動態計算 `Range: bytes=...` 片段的速度。
* HLS 相對順暢（因為 `.ts` 片段可被 cache，對 Client 端來說，影音片段的回應速度會比 HTTP Range Requests 快。）

### 支援度

* HTTP Range Requests:目前所有瀏覽器都支援 mp4 + `Range: bytes=...`
* HLS: Safari 原生支援、Chrome 瀏覽器不支援需要使用 HLS.js 之類第三方套件才可以正常播放。

### 適合使用情境

* HTTP Range Requests: 小流量使用情境，例如雲端影片的播放（Google Drive、MEGA 雲端），當然若使用量真的小，其實也是可以處理 VOD。
* HLS:: 大流量使用情境、VOD 或直播串流..等。

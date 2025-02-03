import express, { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

const app = express();
const PORT = 3000;

app.use(express.static("src/public"));

app.get("/video", (req: Request, res: Response) => {
  const videoPath = path.join(__dirname, "videos/toystory.mp4");
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    console.log("No Range Header!");
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(videoPath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  let start = parseInt(parts[0], 10);
  let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  if (isNaN(start) || start >= fileSize) {
    console.warn("⚠️ 無效的 Range 請求，回應 416");
    res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
    return res.end();
  }

  end = Math.min(end, fileSize - 1);
  const chunkSize = end - start + 1;
  const fileStream = fs.createReadStream(videoPath, { start, end });

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "video/mp4",
  });

  fileStream.pipe(res);
});

app.listen(PORT, () => {
  console.log(`Server is running at: http://localhost:${PORT}`);
});

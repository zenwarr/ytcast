import { getOutput, getStream, Stream } from "./youtube_dl";
import os from "os";
import path from "path";
import fs from "fs";


const DOWNLOADED_CACHE: {
  [episodeId: string]: string
} = {};


export async function initDownloadCache() {
  const cacheDir = os.tmpdir();

  // enumerate files in cache directory
  const files = await fs.promises.readdir(cacheDir);
  for (const file of files) {
    const filePath = path.join(cacheDir, file);

    // get extension and file name without extension
    const ext = path.extname(file);
    const episodeId = path.basename(file, ext);
    if (ext == ".part") {
      continue;
    }

    const stat = await fs.promises.stat(filePath);
    if (stat.isFile()) {
      DOWNLOADED_CACHE[episodeId] = filePath;
    }
  }

  console.log(DOWNLOADED_CACHE);
}


export async function getDownloadedEpisodeFile(episodeId: string, stream: Stream) {
  if (episodeId in DOWNLOADED_CACHE) {
    return DOWNLOADED_CACHE[episodeId];
  } else {
    const downloadFilePath = path.join(os.tmpdir(), `${ episodeId }`) + ".ogg";
    let cmd = `yt-dlp --format=${ stream.formatId } --output=${ downloadFilePath } https://youtube.com/watch?v=${ episodeId }`;
    console.log("downloading episode", cmd);
    const output = await getOutput(cmd);
    console.log(output);
    return downloadFilePath;
  }
}


const EPISODE_STREAM_CACHE: {
  [videoId: string]: Stream | undefined
} = {};


function getCachedStream(episodeId: string) {
  const cached = EPISODE_STREAM_CACHE[episodeId];
  if (!cached || (cached.expire != null && cached.expire.valueOf() <= new Date().valueOf())) {
    return undefined;
  } else {
    return cached;
  }
}


export async function getStreamForEpisode(episodeId: string) {
  const cached = getCachedStream(episodeId);
  if (cached) {
    return cached;
  } else {
    const stream = await getStream(episodeId);
    EPISODE_STREAM_CACHE[episodeId] = stream;
    return stream;
  }
}

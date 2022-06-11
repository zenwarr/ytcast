import { getOutput, getStream, Stream } from "./youtube_dl";
import os from "os";
import path from "path";
import fs from "fs";


const DOWNLOADED_CACHE: {
  [episodeId: string]: string
} = {};


const CACHE_DIR = os.tmpdir();
const IGNORE_EXTS = [ ".part" ];


export async function initDownloadCache() {
  // enumerate files in cache directory
  const files = await fs.promises.readdir(CACHE_DIR);
  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);

    // get extension and file name without extension
    const ext = path.extname(file);
    const episodeId = path.basename(file, ext);
    if (IGNORE_EXTS.includes(ext)) {
      continue;
    }

    const stat = await fs.promises.stat(filePath);
    if (stat.isFile()) {
      DOWNLOADED_CACHE[episodeId] = filePath;
    }
  }
}


const pendingDownloads: {
  [episodeId: string]: Promise<string | undefined>
} = {};


export async function downloadEpisode(episodeId: string) {
  const downloadPromise = pendingDownloads[episodeId];
  if (downloadPromise) {
    return downloadPromise;
  } else {
    return pendingDownloads[episodeId] = downloadEpisodeInternal(episodeId);
  }
}


async function downloadEpisodeInternal(episodeId: string): Promise<string | undefined> {
  if (episodeId in DOWNLOADED_CACHE) {
    return DOWNLOADED_CACHE[episodeId];
  } else {
    const downloadFilePath = path.join(CACHE_DIR, `${ episodeId }`) + ".%(ext)s";
    let cmd = `yt-dlp -x --output="${ downloadFilePath }" https://youtube.com/watch?v=${ episodeId }`;
    console.log("downloading episode", cmd);
    const output = await getOutput(cmd);
    console.log(output);
    return findFileWithName(CACHE_DIR, episodeId);
  }
}


async function findFileWithName(dir: string, name: string): Promise<string | undefined> {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    if (file.startsWith(name + ".") && !IGNORE_EXTS.includes(path.extname(file))) {
      return path.join(dir, file);
    }
  }

  return undefined;
}


export function getMimeTypeFromFilename(filename: string) {
  const ext = path.extname(filename);
  switch (ext) {
    case ".mp3":
      return "audio/mpeg";
    case ".mp4":
      return "video/mp4";
    case ".m4a":
      return "audio/mp4";
    case ".opus":
      return "audio/opus";
    case ".webm":
      return "video/webm";
    default:
      return "audio/mpeg";
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

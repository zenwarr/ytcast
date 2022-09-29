import * as date from "date-fns";
import fs from "fs";
import os from "os";
import path from "path";
import { getOutput } from "./youtube_dl";


const DOWNLOADED_CACHE: {
  [episodeId: string]: string
} = {};


const CACHE_DIR = os.tmpdir();
const IGNORE_EXTS = [ ".part" ];

function getEnvNumber(name: string): number | undefined {
  const value = process.env[name];
  if (value) {
    const n = +value;
    if (!isNaN(n)) {
      return n;
    }
  }

  return undefined;
}

const MAX_CACHE_SIZE = getEnvNumber("MAX_CACHE_SIZE") || 1024 * 1024 * 1024 * 4; // 4gb
const MAX_CACHE_AGE_IN_DAYS = 4;

const REMOVE_SPONSORBLOCK_CATEGORIES: string | undefined = process.env["REMOVE_SPONSORBLOCK_CATEGORIES"];


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
    let cmd = `yt-dlp -x --output="${ downloadFilePath }" `;
    if (REMOVE_SPONSORBLOCK_CATEGORIES) {
      cmd += ` --sponsorblock-remove="${ REMOVE_SPONSORBLOCK_CATEGORIES }" `;
    }
    cmd += ` https://youtube.com/watch?v=${ episodeId }`;
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


export async function startOptimizeCache() {
  optimizeCache();
  setInterval(optimizeCache, 1000 * 60 * 60); // every hour
}


/**
 * We do not care here that a file can be removed while downloading because the cache should be large enough.
 * Just redownload a file if it happens.
 */
async function optimizeCache() {
  console.log("Optimizing cache");

  const files = await fs.promises.readdir(CACHE_DIR);
  const fileInfo = new Map<string, fs.Stats>();

  let totalSize = 0;
  for (const file of files) {
    const stat = await fs.promises.stat(path.join(CACHE_DIR, file));
    fileInfo.set(file, stat);

    if (stat.isFile()) {
      // check file age
      const filePath = path.join(CACHE_DIR, file);
      const fileAge = date.differenceInDays(new Date(), stat.birthtime);

      // remove file if older than MAX_CACHE_AGE_IN_DAYS
      if (fileAge > MAX_CACHE_AGE_IN_DAYS) {
        await fs.promises.unlink(filePath);
      } else {
        totalSize += stat.size;
      }
    }
  }

  console.log("Current cache size:", Math.round(totalSize / 1024 / 1024) + "mb");

  if (totalSize > MAX_CACHE_SIZE) {
    // sort files by age
    const sortedFiles = files.sort((a, b) => {
      return fileInfo.get(a)!.birthtime.valueOf() - fileInfo.get(b)!.birthtime.valueOf();
    });

    // remove files until total size is below MAX_CACHE_SIZE
    for (const file of sortedFiles) {
      const stat = await fs.promises.stat(path.join(CACHE_DIR, file));
      if (stat.isFile()) {
        const filePath = path.join(CACHE_DIR, file);
        await fs.promises.unlink(filePath);
        totalSize -= stat.size;
        if (totalSize <= MAX_CACHE_SIZE) {
          break;
        }
      }
    }
  }
}

import { getOutput, getStream, Stream } from "./youtube_dl";
import os from "os";
import path from "path";


const DOWNLOADED_CACHE: {
  [url: string]: string
} = {};


export async function getDownloadedEpisodeFile(episodeId: string, stream: Stream) {
  const url = stream.url;

  if (url in DOWNLOADED_CACHE) {
    return DOWNLOADED_CACHE[url];
  } else {
    const downloadFilePath = path.join(os.tmpdir(), `${ episodeId }`);
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

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
    let cmd = `youtube-dl --format=${ stream.formatId } --output=${ downloadFilePath } https://youtube.com/watch?v=${ episodeId }`;
    console.log("downloading episode", cmd);
    const output = await getOutput(cmd);
    console.log(output);
    return downloadFilePath;
  }
}


const EPISODE_STREAM_CACHE: {
  [videoId: string]: Stream | undefined
} = {};


export async function getStreamForEpisode(episodeId: string) {
  if (episodeId in EPISODE_STREAM_CACHE) {
    return EPISODE_STREAM_CACHE[episodeId];
  } else {
    const stream = await getStream(`https://youtube.com/watch?v=${ episodeId }`);
    EPISODE_STREAM_CACHE[episodeId] = stream;
    return stream;
  }
}

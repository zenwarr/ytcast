import got from "got";
import cheerio from "cheerio";
import path from "path";
import fs from "fs";
import moment from "moment";
import { DataNode } from "domhandler";
import { downloadStream, getVideoInfo, Stream, VideoInfo } from "./youtube_dl";


const SECRETS_DIR = process.env["SECRETS_DIR"] ?? "/secrets";


export async function getLiveStreamsForChannel(channelId: string): Promise<string[]> {
  const response = await got.get(`https://www.youtube.com/channel/${ channelId }`, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "accept-encoding": "gzip, deflate, br",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0"
    }
  });

  let doc = cheerio.load(response.body);
  const scriptElements = doc("script");
  for (const script of scriptElements) {
    const childNode = script.childNodes[0];
    if (!childNode || childNode.type !== "text") {
      continue;
    }

    const textNode = childNode as any as DataNode;
    const text = textNode.nodeValue;

    const PREFIX = "var ytInitialData = ";
    if (text.startsWith(PREFIX)) {
      const rawJSON = JSON.parse(text.slice(PREFIX.length, -1));
      const videoObjects = findObjects(rawJSON, obj => {
        return typeof obj.videoId === "string" && Array.isArray(obj.thumbnailOverlays) && obj.thumbnailOverlays.some((x: any) => x.thumbnailOverlayTimeStatusRenderer?.style === "LIVE");
      });
      return [ ...new Set(videoObjects.map(x => x.videoId)) ];
    }
  }

  return [];
}


function findObjects(input: any, criteria: (x: any) => boolean): any[] {
  const result: any[] = [];

  if (Array.isArray(input)) {
    for (const item of input) {
      result.push(...findObjects(item, criteria));
    }
  } else if (input != null && typeof input === "object") {
    if (criteria(input)) {
      result.push(input);
    }

    for (const value of Object.values(input)) {
      result.push(...findObjects(value, criteria));
    }
  }

  return result;
}


interface LiveRecordingConfig {
  channels: {
    id: string;
  }[];
}


async function getLiveRecordingChannels(): Promise<LiveRecordingConfig> {
  try {
    return JSON.parse(await fs.promises.readFile(path.join(SECRETS_DIR, "live_recorder_config.json"), "utf-8"));
  } catch (err) {
    if (err.code === "ENOENT") {
      return { channels: [] };
    } else {
      throw err;
    }
  }
}


interface LiveRecording {
  channelId: string;
  videoId: string;
  file: string;
  startTs: Date;
  endTs?: Date;
  lastError?: string;
}


export let LIVE_RECORDINGS: LiveRecording[] = [];


export async function startLiveRecorder() {
  checkLiveRecordings().catch(err => {
    console.error("failed to check live streams", err);
  });

  setInterval(async () => {
    checkLiveRecordings().catch(err => console.error("failed to check live streams", err));
  }, moment.duration(10, "minute").asMilliseconds());
}


async function checkLiveRecordings() {
  console.log("checking live streams");

  const config = await getLiveRecordingChannels();

  for (const channel of config.channels) {
    const liveStreams = await getLiveStreamsForChannel(channel.id);
    for (const liveStream of liveStreams) {
      if (!isRecording(liveStream)) {
        await startRecording(channel.id, liveStream);
      }
    }
  }
}


function isRecording(videoId: string): boolean {
  return LIVE_RECORDINGS.some(x => x.videoId === videoId && x.endTs == null);
}


async function startRecording(channelId: string, videoId: string): Promise<void> {
  const videoUrl = `https://youtube.com/watch?v=${ videoId }`;
  console.log(`start recording live stream: ${ videoUrl }`);

  await fs.promises.mkdir(path.join(SECRETS_DIR, "live_recordings"), { recursive: true });

  const fileName = `${ videoId }-${ new Date().toISOString().replace(/[\:\.]/g, "_") }.mp4`;
  const recording: LiveRecording = {
    channelId,
    videoId,
    file: path.join(SECRETS_DIR, "live_recordings", fileName),
    startTs: new Date()
  };
  LIVE_RECORDINGS.push(recording);

  const videoInfo = await getVideoInfo(videoId);
  const bestStream = chooseBestStreamForRecording(videoInfo);
  if (!bestStream) {
    recording.lastError = "no suitable stream found";
    return;
  }

  downloadStream(videoId, bestStream.formatId, recording.file).then(() => {
    recording.endTs = new Date();
    console.log(`live stream recording successfully completed: ${ videoUrl }`);
  }, err => {
    recording.lastError = err.message;
    recording.endTs = new Date();
    console.log(`live stream recording interrupted with error: ${ videoUrl }, ${ err }`);
  });
}


const BEST_VIDEO_WIDTH = 1280;


function chooseBestStreamForRecording(videoInfo: VideoInfo): Stream | undefined {
  const ideal = videoInfo.streams.find(s => s.videoWidth === BEST_VIDEO_WIDTH);
  if (ideal) {
    return ideal;
  }

  const sorted = [ ...videoInfo.streams ]
  .filter(x => x.videoWidth != null)
  .sort((a, b) => {
    const aDiff = Math.abs((a.videoWidth ?? 0) - BEST_VIDEO_WIDTH);
    const bDiff = Math.abs((b.videoWidth ?? 0) - BEST_VIDEO_WIDTH);
    return aDiff - bDiff;
  });

  return sorted[0];
}

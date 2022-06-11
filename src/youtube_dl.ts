import * as childProcess from "child_process";
import * as url from "url";


export interface Stream {
  formatId: string;
  url: string;
  mimeType: string;
  videoWidth?: number;
  hasAudio: boolean;
  hasVideo: boolean;
  fileSize?: number;
  audioBitrate?: number;
  protocol?: string;
  expire?: Date;
}


export interface VideoInfo {
  streams: Stream[];
}


export async function getOutput(cmd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    childProcess.exec(cmd, {
      maxBuffer: 1024 * 1024 * 32
    }, (err, stdout, stderr) => {
      if (err != null) {
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}


export function downloadStream(videoId: string, formatId: string, fileName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = childProcess.spawn(`yt-dlp --format=${ formatId } --output=${ fileName } https://youtube.com/watch?v=${ videoId }`, {
      stdio: "inherit",
      shell: true
    });
    proc.on("close", resolve);
    proc.on("error", reject);
  });
}


export async function getVideoInfo(videoId: string): Promise<VideoInfo> {
  const videoUrl = `https://youtube.com/watch?v=${ videoId }`;
  const output = JSON.parse(await getOutput(`yt-dlp --dump-json ${ videoUrl }`));
  const formats = output.formats;

  return {
    streams: formats.map((format: any) => {
      const mimeType = format.vcodec !== "none" ? "video/" + format.ext : "audio/" + format.ext;
      return {
        formatId: format.format_id,
        url: format.url,
        mimeType,
        videoWidth: format.width,
        hasAudio: format.acodec !== "none",
        hasVideo: format.vcodec !== "none",
        fileSize: format.filesize ?? undefined,
        audioBitrate: Math.round(format.abr ?? format.tbr),
        protocol: format.protocol,
        expire: getExpireDateFromUrl(format.url)
      };
    })
  };
}


function getExpireDateFromUrl(streamUrl: string): Date | undefined {
  const parsed = new url.URL(streamUrl);
  if (parsed.hostname === "manifest.googlevideo.com") {
    const parts = parsed.pathname.split("/").filter(x => x !== "");
    const expireTs = parts[4];
    if (!expireTs || isNaN(+expireTs)) {
      return undefined;
    }

    return new Date(+expireTs * 1000);
  } else if (parsed.hostname.endsWith(".googlevideo.com")) {
    const expireTs = parsed.searchParams.get("expire");
    if (!expireTs || isNaN(+expireTs)) {
      return undefined;
    }

    return new Date(+expireTs * 1000);
  } else {
    return undefined;
  }
}


const ALLOWED_PROTOCOLS = [ "http", "https" ];


export async function getStream(videoId: string): Promise<Stream | undefined> {
  const streamInfo = await getVideoInfo(videoId);
  const streams = streamInfo.streams.filter(f => !f.hasVideo && f.hasAudio && f.protocol != null && ALLOWED_PROTOCOLS.includes(f.protocol));
  streams.sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0));
  return streams[0];
}


getOutput("yt-dlp --version").then(version => console.log("yt-dlp version: " + version));

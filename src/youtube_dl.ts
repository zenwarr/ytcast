import * as childProcess from "child_process";


export interface Stream {
  formatId: number;
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


export async function getVideoInfo(videoUrl: string): Promise<VideoInfo> {
  const output = JSON.parse(await getOutput(`youtube-dl --dump-json ${ videoUrl }`));
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
  const parsed = new URL(streamUrl);
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


export async function getStream(videoUrl: string): Promise<Stream | undefined> {
  const streamInfo = await getVideoInfo(videoUrl);
  const streams = streamInfo.streams.filter(f => !f.hasVideo && f.hasAudio);
  streams.sort((a, b) => {
    if (b.protocol === "https" && a.protocol !== "https") {
      return 1;
    } else {
      return (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0)
    }
  });
  return streams[0];
}


getOutput("youtube-dl --version").then(version => console.log("youtube-dl version: " + version));

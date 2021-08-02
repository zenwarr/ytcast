import * as childProcess from "child_process";


export interface Stream {
  url: string;
  mimeType: string;
  videoWidth?: number;
  hasAudio: boolean;
  hasVideo: boolean;
  fileSize?: number;
}


export interface VideoInfo {
  streams: Stream[];
}


async function getOutput(cmd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    childProcess.exec(cmd, (err, stdout, stderr) => {
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
        url: format.url,
        mimeType,
        videoWidth: format.width,
        hasAudio: format.acodec !== "none",
        hasVideo: format.vcodec !== "none",
        fileSize: format.filesize ?? undefined,
      };
    })
  };
}


export async function getStream(videoUrl: string): Promise<Stream | undefined> {
  const streamInfo = await getVideoInfo(videoUrl);
  const streams = streamInfo.streams.filter(f => !f.hasVideo && f.hasAudio);
  return streams[0];
}


getOutput("youtube-dl --version").then(version => console.log("youtube-dl version: " + version));
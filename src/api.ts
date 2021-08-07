import { FastifyInstance } from "fastify";
import { getChannel, getPlaylist } from "./youtube";
import got from "got";
import { getFeedXmlForChannel, getFeedXmlForPlaylist } from "./podcast";
import { getStreamForEpisode } from "./download_cache";
import { LIVE_RECORDINGS } from "./youtube_live";


const USE_REDIRECT = true;


export default async function initRoutes(app: FastifyInstance) {
  app.get<{
    Params: { channelId: string }
  }>("/channels/:channelId", async (req, res) => {
    const channelId = req.params.channelId;
    const channel = await getChannel(channelId);

    res.header("content-type", "application/xml");
    return getFeedXmlForChannel(channel);
  });


  app.get<{
    Params: { playlistId: string }
  }>("/playlists/:playlistId", async (req, res) => {
    const playlistId = req.params.playlistId;
    const playlist = await getPlaylist(playlistId);

    res.header("content-type", "application/xml");
    return getFeedXmlForPlaylist(playlist);
  });


  app.get<{
    Params: { episodeId: string }
  }>("/episodes/:episodeId", async (req, res) => {
    const stream = await getStreamForEpisode(req.params.episodeId);
    if (!stream) {
      throw new Error("Episode not found");
    }

    if (stream.protocol === "http_dash_segments") {
      throw new Error("Method not implemented"); // todo
      // const downloadedFile = await getDownloadedEpisodeFile(req.params.episodeId, stream);
      // console.log(downloadedFile);
      // throw new Error("Method not implemented"); // todo
    } else {
      if (USE_REDIRECT) {
        res.redirect(302, stream.url);
      } else {
        return got.stream.get(stream.url, {
          headers: {
            "user-agent": req.headers["user-agent"],
            "accept": req.headers.accept,
            "accept-language": req.headers["accept-language"],
            "range": req.headers.range
          }
        });
      }
    }
  });


  app.get("/live_recordings", async req => {
    return LIVE_RECORDINGS;
  });


  app.get("/", async req => {
    return "hello, this is yt-cast!";
  });
}

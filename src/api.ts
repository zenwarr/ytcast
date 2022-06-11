import * as fs from "fs";
import { FastifyInstance } from "fastify";
import { getChannel, getPlaylist } from "./youtube";
import { getFeedXmlForChannel, getFeedXmlForPlaylist } from "./podcast";
import { downloadEpisode, getMimeTypeFromFilename, getStreamForEpisode } from "./download_cache";
import { LIVE_RECORDINGS } from "./youtube_live";


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
    const filePath = await downloadEpisode(req.params.episodeId);
    if (!filePath) {
      throw new Error(`episode ${ req.params.episodeId } not found`);
    }

    res.header("content-type", getMimeTypeFromFilename(filePath));
    return fs.createReadStream(filePath);
  });


  app.get("/live_recordings", async req => {
    return LIVE_RECORDINGS;
  });


  app.get("/", async () => {
    return "hello, this is yt-cast!";
  });
}

import { FastifyInstance } from "fastify";
import { toXML } from "jstoxml";
import { getChannel, getLiveStreamsForChannel, getPlaylist, VideoInfo } from "./youtube";
import { getStream } from "./youtube_dl";
import got from "got";
import { getFeedXmlForChannel, getFeedXmlForPlaylist } from "./podcast";


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
  }>("/episodes/:episodeId", async req => {
    const episodeId = req.params.episodeId;

    const stream = await getStream(`https://youtube.com/watch?v=${ episodeId }`);
    if (!stream) {
      throw new Error("Episode not found");
    }

    return got.stream.get(stream.url, {
      headers: {
        "user-agent": req.headers["user-agent"],
        "accept": req.headers.accept,
        "accept-language": req.headers["accept-language"],
        "range": req.headers.range
      }
    });
  });


  app.get<{
    Params: { channelId: string }
  }>("/live/:channelId", async req => {
    const streams = await getLiveStreamsForChannel(req.params.channelId);
    return streams;
  });


  app.get("/", async req => {
    return "hello, this is yt-cast!";
  });
}

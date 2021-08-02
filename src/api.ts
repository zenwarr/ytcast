import { FastifyInstance } from "fastify";
import { toXML } from "jstoxml";
import { getChannel, VideoInfo } from "./youtube";
import { getStream } from "./youtube_dl";
import got from "got";


const PUBLIC_DOMAIN = process.env["PUBLIC_DOMAIN"];


export default async function initRoutes(app: FastifyInstance) {
  app.get<{
    Params: { channelId: string }
  }>("/channels/:channelId", async (req, res) => {
    const channelId = req.params.channelId;
    const channel = await getChannel(channelId);

    res.header("content-type", "application/xml");

    return toXML({
      _name: "rss",
      _attrs: {
        "xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
        version: "2.0",
      },
      _content: {
        channel: [
          { title: channel.title },
          { link: `https://${ PUBLIC_DOMAIN }/channels/${ channelId }` },
          { language: "en-us" },
          { description: channel.description },
          {
            _name: "itunes:image",
            _attrs: {
              href: channel.imageUrl
            },
          },
          ...channel.videos.map(item => getFeedItemForVideo(item))
        ]
      }
    }, {
      header: true,
      indent: "  "
    });
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


  app.get("/", async req => {
    return "hello, this is yt-cast!";
  });
}


function getFeedItemForVideo(video: VideoInfo) {
  return {
    item: [
      {
        title: video.title,
      },
      {
        "itunes:summary": video.description,
      },
      {
        "itunes:image": video.thumbnail
      },
      {
        _name: "enclosure",
        _attrs: {
          url: `https://${ PUBLIC_DOMAIN }/episodes/${ video.id }`,
          length: "8727310",
          type: "audio/x-m4a",
        },
      },
      {
        guid: `https://${ PUBLIC_DOMAIN }/episodes/${ video.id }`,
      },
      // {
      //   pubDate: "Wed, 15 Jun 2011 19:00:00 GMT",
      // },
      // {
      //   "itunes:duration": "7:04",
      // }
    ],
  };
}

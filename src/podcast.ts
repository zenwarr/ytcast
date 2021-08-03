import { ChannelInfo, PlaylistInfo, VideoInfo } from "./youtube";
import { toXML } from "jstoxml";
import moment from "moment";


const PUBLIC_DOMAIN = process.env["PUBLIC_DOMAIN"];


export function getFeedXmlForChannel(channel: ChannelInfo) {
  return toXML({
    _name: "rss",
    _attrs: {
      "xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
      version: "2.0",
    },
    _content: {
      channel: [
        { title: channel.title },
        { link: `https://${ PUBLIC_DOMAIN }/channels/${ channel.id }` },
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
}


export function getFeedXmlForPlaylist(playlist: PlaylistInfo) {
  return toXML({
    _name: "rss",
    _attrs: {
      "xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
      version: "2.0",
    },
    _content: {
      channel: [
        { title: playlist.title },
        { link: `https://${ PUBLIC_DOMAIN }/playlists/${ playlist.id }` },
        { language: "en-us" },
        { description: playlist.description },
        {
          _name: "itunes:image",
          _attrs: {
            href: playlist.imageUrl
          },
        },
        ...playlist.videos.map(item => getFeedItemForVideo(item))
      ]
    }
  }, {
    header: true,
    indent: "  "
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
      {
        pubDate: moment(video.pubTs).format("ddd, D MMM YYYY kk:mm:ss GMT")
      },
      // {
      //   "itunes:duration": "7:04",
      // }
    ],
  };
}

import { google } from "googleapis";
import moment from "moment";


const youtube = google.youtube({
  version: "v3",
  auth: process.env["GOOGLE_API_KEY"]
});


export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  pubTs: number;
  thumbnail?: string;
  duration?: number;
}


async function getPlaylistItems(playlistId: string, token?: string): Promise<VideoInfo[]> {
  const playlistReply = await youtube.playlistItems.list({
    playlistId: playlistId,
    pageToken: token,
    part: [ "contentDetails", "id", "status", "snippet" ],
    maxResults: 50
  });

  let results: VideoInfo[] = playlistReply.data.items?.map(item => {
    const thumbnails = item.snippet?.thumbnails;
    const thumbnail = (thumbnails?.maxres ?? thumbnails?.high ?? thumbnails?.default)?.url;

    return {
      id: item.snippet?.resourceId?.videoId!,
      title: item.snippet?.title!,
      description: item.snippet?.description!,
      pubTs: moment(item.snippet?.publishedAt!).valueOf(),
      thumbnail: thumbnail ?? undefined
    };
  }) ?? [];

  const videos = await getExtendedVideoInfo(results.map(r => r.id));
  for (const item of results) {
    const extended = videos[item.id];
    if (extended) {
      item.duration = extended.duration;
    }
  }

  const nextPageToken = playlistReply.data.nextPageToken;
  if (nextPageToken) {
    results = [ ...results, ...(await getPlaylistItems(playlistId, nextPageToken)) ];
  }

  return results;
}


export interface ChannelInfo {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  videos: VideoInfo[];
}


export async function getChannel(channelId: string): Promise<ChannelInfo> {
  const channelReply = await youtube.channels.list({
    id: [ channelId ],
    part: [ "contentDetails", "snippet" ]
  });

  let uploads: VideoInfo[];
  const uploadsPlaylistId = channelReply.data.items?.[0].contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    uploads = [];
  } else {
    uploads = await getPlaylistItems(uploadsPlaylistId);
  }

  const thumbnails = channelReply.data.items?.[0].snippet?.thumbnails;
  const thumnail = (thumbnails?.high ?? thumbnails?.default)?.url;

  return {
    id: channelId,
    title: channelReply.data.items?.[0].snippet?.title ?? "<no title>",
    description: channelReply.data.items?.[0].snippet?.description ?? undefined,
    imageUrl: thumnail ?? undefined,
    videos: uploads
  };
}


export interface PlaylistInfo {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  videos: VideoInfo[];
}


export async function getPlaylist(playlistId: string): Promise<PlaylistInfo> {
  const playlistReply = await youtube.playlists.list({
    id: [ playlistId ],
    part: [ "contentDetails", "snippet" ]
  });

  const items = await getPlaylistItems(playlistId);

  const thumbnails = playlistReply.data.items?.[0].snippet?.thumbnails;
  const thumbnail = (thumbnails?.high ?? thumbnails?.default)?.url;

  return {
    id: playlistId,
    title: playlistReply.data.items?.[0].snippet?.title ?? "<no title>",
    description: playlistReply.data.items?.[0].snippet?.description ?? undefined,
    videos: items,
    imageUrl: thumbnail ?? undefined
  };
}


export interface ExtendedVideoInfo {
  duration: number;
}


export type ExtendedVideoInfoMap = { [id: string]: ExtendedVideoInfo };


export async function getExtendedVideoInfo(videoIds: string[]): Promise<ExtendedVideoInfoMap> {
  const reply = await youtube.videos.list({
    id: videoIds,
    part: [ "contentDetails" ]
  });

  const result: ExtendedVideoInfoMap = {};
  for (const item of reply.data.items ?? []) {
    if (!item.id || !item.contentDetails) {
      continue;
    }

    result[item.id] = {
      duration: moment.duration(item.contentDetails.duration).asSeconds()
    };
  }

  return result;
}


export interface LiveStreamInfo {
  videoId: string;
}


export async function getLiveStreamsForChannel(channelId: string): Promise<any> {
  return (await youtube.search.list({
    channelId,
    part: [ "snippet" ],
    type: [ "video" ],
    eventType: "live"
  })).data;
}

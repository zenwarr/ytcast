import { google } from "googleapis";


const youtube = google.youtube({
  version: "v3",
  auth: process.env["GOOGLE_API_KEY"]
});


export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  pubDate: Date;
  thumbnail?: string;
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
      pubDate: new Date(item.snippet?.publishedAt!),
      thumbnail: thumbnail ?? undefined
    };
  }) ?? [];

  const nextPageToken = playlistReply.data.nextPageToken;
  if (nextPageToken) {
    results = [ ...results, ...(await getPlaylistItems(playlistId, nextPageToken)) ];
  }

  return results;
}


interface ChannelInfo {
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
    title: channelReply.data.items?.[0].snippet?.title ?? "<no title>",
    description: channelReply.data.items?.[0].snippet?.description ?? undefined,
    imageUrl: thumnail ?? undefined,
    videos: uploads
  };
}

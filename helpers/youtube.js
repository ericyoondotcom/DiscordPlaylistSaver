import fetch from "node-fetch";

const YOUTUBE_URL_REGEX = /.*music.youtube\.com\/watch\?v=([^?&]+)/ig;
const YOUTUBE_PLAYLIST_REGEX = /.*music.youtube\.com\/playlist\?list=([^?&]+)/ig;

export default class Youtube {
    constructor(authConnect){
        this.authConnect = authConnect;
    }

    getTrackById = async (id, guildId) => {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}`;
        const res = await fetch(url, {
            headers: {
                "Authorization": "Bearer " + await this.authConnect.getAccessToken("google", guildId),
                "Content-Type": "application/json"
            }
        });
        if(!res.ok){
            console.warn("YT Get Track by ID: Received " + res.status + ": " + await res.text());
            throw new Error("Error response from Youtube");
        }
        const json = await res.json();
        if(json.items.length == 0) return null;
        const artist = json.items[0].snippet.channelTitle.replace(" - Topic", "");
        return {
            name: json.items[0].snippet.title,
            artist,
            youtubeId: json.items[0].id
        }
    }

    getTrackIdFromURL = (url) => {
        const matches = Array.from(url.matchAll(YOUTUBE_URL_REGEX));
        if(matches.length == 0) return null;
        return matches[0][1]; // 1st capturing group of 1st match
    }

    getPlaylistIdFromURL = (url) => {
        const matches = Array.from(url.matchAll(YOUTUBE_PLAYLIST_REGEX));
        if(matches.length == 0) return null;
        return matches[0][1]; // 1st capturing group of 1st match
    }

    addToPlaylist = async (youtubeId, guildId, playlistId) => {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + await this.authConnect.getAccessToken("google", guildId),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                snippet: {
                    playlistId: playlistId,
                    resourceId: {
                        kind: "youtube#video",
                        videoId: youtubeId
                    }
                }
            })
        });
        if(!res.ok) console.error(await res.json());
        return;
    }

    searchForSong = async (name, artist, guildId) => {
        // videoCategoryId 10 is music!
        const queryString = `${name} ${artist} audio`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryString)}&type=video&videoCategoryId=10`;
        const res = await fetch(url, {
            headers: {
                "Authorization": "Bearer " + await this.authConnect.getAccessToken("google", guildId),
                "Content-Type": "application/json"
            }
        });
        const json = await res.json();
        if(json.items.length == 0) return null;
        return json.items.map(i => ({
            name: i.snippet.title,
            youtubeId: i.id.videoId,
            url: `https://music.youtube.com/watch?v=${i.id.videoId}`
        }));
    }
}

import fetch from "node-fetch";
import {YOUTUBE_PLAYLIST_ID} from "../config.js";

const YOUTUBE_URL_REGEX = /.*music.youtube\.com\/watch\?v=([^?&]+)/ig;

export default class Youtube {
    constructor(oauth, logMessage){
        this.oauth = oauth;
        this.logMessage = logMessage;
    }

    getTrackById = async (id) => {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}`;
        const res = await fetch(url, {
            headers: {
                "Authorization": await this.oauth.getAccessToken("youtube"),
                "Content-Type": "application/json"
            }
        });
        if(!res.ok){
            console.warn("YT Get Track by ID: Received " + res.status + ": " + await res.text());
            throw new Error("Error response from Youtube");
        }
        const json = await res.json();
        if(json.items.length == 0) return null;
        if(process.env.NODE_ENV === "development") console.log(json.items[0].snippet);
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

    addToPlaylist = async (youtubeId) => {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
            method: "POST",
            headers: {
                "Authorization": await this.oauth.getAccessToken("youtube"),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                snippet: {
                    playlistId: YOUTUBE_PLAYLIST_ID,
                    resourceId: {
                        kind: "youtube#video",
                        videoId: youtubeId
                    }
                }
            })
        });
        if(!res.ok) console.log(await res.json());
        return;
    }

    searchForSong = async (name, artist) => {
        // videoCategoryId 10 is music!
        const queryString = `${name} ${artist} audio`;
        console.log("Youtube: searching for " + queryString);
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryString)}&type=video&videoCategoryId=10`;
        const res = await fetch(url, {
            headers: {
                "Authorization": await this.oauth.getAccessToken("youtube"),
                "Content-Type": "application/json"
            }
        });
        const json = await res.json();
        if(process.env.NODE_ENV === "development") console.log(json.items);
        if(json.items.length == 0) return null;
        return json.items.map(i => ({
            name: i.snippet.title,
            youtubeId: i.id.videoId,
            url: `https://music.youtube.com/watch?v=${i.id.videoId}`
        }));
    }
}

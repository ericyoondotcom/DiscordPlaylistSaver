import fetch from "node-fetch";
import {SPOTIFY_PLAYLIST_ID} from "../config.js";

const SPOTIFY_URL_REGEX = /.*spotify\.com\/track\/([^?]+)/ig;

export default class Spotify {
    constructor(oauth, logMessage){
        this.oauth = oauth;
        this.logMessage = logMessage;
    }

    getTrackById = async (id) => {
        const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
            headers: {
                "Authorization": await this.oauth.getAccessToken("spotify")
            }
        });
        if(!res.ok){
            console.warn("Spotify Get Track by ID: Received " + res.status + ": " + await res.text());
            throw new Error("Error response from Spotify");
        }
        const json = await res.json();
        if(process.env.NODE_ENV === "development") console.log(json);
        let artist = "";
        if(json.artists.length > 0){
            artist = json.artists[0].name
        }
        return {
            name: json.name,
            artist,
            spotifyURI: json.uri
        }
    }

    getTrackIdFromURL = (url) => {
        const matches = Array.from(url.matchAll(SPOTIFY_URL_REGEX));
        if(matches.length == 0) return null;
        return matches[0][1]; // 1st capturing group of 1st match
    }

    addToPlaylist = async (spotifyURI) => {
        const res = await fetch(`https://api.spotify.com/v1/playlists/${SPOTIFY_PLAYLIST_ID}/tracks`, {
            method: "POST",
            headers: {
                "Authorization": await this.oauth.getAccessToken("spotify"),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uris: [spotifyURI]
            })
        });
        if(!res.ok) console.log(await res.json());
        return;
    }

    searchForSong = async (name, artist) => {
        const queryString = `${name} ${artist}`;
        console.log("Spotify: searching for " + queryString);
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(queryString)}&type=track&limit=1`;
        const res = await fetch(url, {
            headers: {
                "Authorization": await this.oauth.getAccessToken("spotify"),
                "Content-Type": "application/json"
            }
        });
        const json = await res.json();
        if(json.tracks == undefined || json.tracks.items == undefined) return null;
        if(process.env.NODE_ENV === "development") console.log(json.tracks.items)
        if(json.tracks.items.length == 0) return null;
        return json.tracks.items.map(i => ({
            name: i.name,
            spotifyURI: i.uri,
            queryString,
            url: `https://open.spotify.com/track/${i.id}`
        }));
    }
}

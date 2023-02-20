import fetch from "node-fetch";

const SPOTIFY_URL_REGEX = /.*spotify\.com\/track\/([^?]+)/ig;
const SPOTIFY_PLAYLIST_REGEX = /.*spotify\.com\/playlist\/([^?]+)/ig;

export default class Spotify {
    constructor(authConnect){
        this.authConnect = authConnect;
    }

    getTrackById = async (id, guildId) => {
        const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
            headers: {
                "Authorization": "Bearer " + await this.authConnect.getAccessToken("spotify", guildId)
            }
        });
        if(!res.ok){
            console.warn("Spotify Get Track by ID: Received " + res.status + ": " + await res.text());
            throw new Error("Error response from Spotify");
        }
        const json = await res.json();
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

    getPlaylistIdFromURL = (url) => {
        const matches = Array.from(url.matchAll(SPOTIFY_PLAYLIST_REGEX));
        if(matches.length == 0) return null;
        return matches[0][1]; // 1st capturing group of 1st match
    }

    addToPlaylist = async (spotifyURI, guildId, playlistId) => {
        const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + await this.authConnect.getAccessToken("spotify", guildId),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uris: [spotifyURI]
            })
        });
        if(!res.ok) console.error(await res.json());
        return;
    }

    searchForSong = async (name, artist, guildId) => {
        const queryString = `${name} ${artist}`;
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(queryString)}&type=track&limit=1`;
        const res = await fetch(url, {
            headers: {
                "Authorization": "Bearer " + await this.authConnect.getAccessToken("spotify", guildId),
                "Content-Type": "application/json"
            }
        });
        const json = await res.json();
        if(json.tracks == undefined || json.tracks.items == undefined) return null;
        if(json.tracks.items.length == 0) return null;
        return json.tracks.items.map(i => ({
            name: i.name,
            spotifyURI: i.uri,
            queryString,
            url: `https://open.spotify.com/track/${i.id}`
        }));
    }
}

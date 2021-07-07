import DiscordAPI from "discord.js";
import {DISCORD_TOKEN, LOGGING_CHANNEL, SEND_CROSSPLATFORM_URL} from "./config.js";
import Spotify from "./helpers/spotify.js";
import Youtube from "./helpers/youtube.js";
import OAuthManager from "./helpers/oauth.js";

const bot = new DiscordAPI.Client();

let oauth, spotify, youtube;
let logChannel = null;

bot.login(DISCORD_TOKEN);

bot.on("ready", () => {
    console.log("Bot connected to Discord.");
    if(process.env.NODE_ENV === "development") console.log("## Running in Development environment ##\n## Songs will not be added to playlists ##");
    oauth = new OAuthManager(logMessage);
    spotify = new Spotify(oauth, logMessage);
    youtube = new Youtube(oauth, logMessage);
});

bot.on("message", async (message) => {
    const split = message.content.split(" ");
    if(message.content.startsWith("linkspotify")){
        if(split.length < 2){
            message.react("❌");
            return;
        }
        oauth.runAuthFlow("spotify", split[1]);
        message.react("💬");
        return;
    }
    if(message.content.startsWith("linkyt")){
        if(split.length < 2){
            message.react("❌");
            return;
        }
        oauth.runAuthFlow("youtube", split[1]);
        message.react("💬");
        return;
    }
    if(message.author.bot) return;
    const spotifyId = spotify.getTrackIdFromURL(message.content);
    if(spotifyId !== null){
        // Link is Spotify
        const {name, artist, spotifyURI} = await spotify.getTrackById(spotifyId);
        
        spotify.addToPlaylist(spotifyURI).then(() => {
            message.react("💚");
        });
        
        youtube.searchForSong(name, artist).then(async searchRes => {
            if(searchRes == null) return;
            if(SEND_CROSSPLATFORM_URL) message.channel.send(`❤️ YouTube link for **${searchRes[0].name}**\n${searchRes[0].url}`);
            if(process.env.NODE_ENV !== "development") await youtube.addToPlaylist(searchRes[0].youtubeId);
            message.react("❤️");
        });
        
        return;
    }
    const ytId = youtube.getTrackIdFromURL(message.content);
    if(ytId !== null){
        // Link is Youtube
        const {name, artist, youtubeId} = await youtube.getTrackById(ytId);
        youtube.addToPlaylist(youtubeId).then(() => {
            message.react("❤️");
        });

        spotify.searchForSong(name, artist).then(async searchRes => {
            if(searchRes == null) return;
            if(SEND_CROSSPLATFORM_URL) message.channel.send(`💚 Spotify link for **${searchRes[0].name}**\n${searchRes[0].url}`);
            if(process.env.NODE_ENV !== "development") await spotify.addToPlaylist(searchRes[0].spotifyURI);
            message.react("💚");
        })
        return;
    }
});

async function logMessage(message){
    if(logChannel == null) logChannel = await bot.channels.fetch(LOGGING_CHANNEL);
    await logChannel.send(message);
}
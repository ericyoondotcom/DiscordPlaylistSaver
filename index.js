import DiscordAPI from "discord.js";
import {DISCORD_TOKEN, LOGGING_CHANNEL} from "./config.js";
import Spotify from "./helpers/spotify.js";
import Youtube from "./helpers/youtube.js";
import OAuthManager from "./helpers/oauth.js";

const bot = new DiscordAPI.Client();

let oauth, spotify, youtube;
let logChannel = null;

bot.login(DISCORD_TOKEN);

bot.on("ready", () => {
    console.log("Bot connected to Discord.");
    oauth = new OAuthManager(logMessage);
    spotify = new Spotify(oauth, logMessage);
    youtube = new Youtube(oauth, logMessage);
});

bot.on("message", (message) => {
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
});

async function logMessage(message){
    if(logChannel == null) logChannel = await bot.channels.fetch(LOGGING_CHANNEL);
    await logChannel.send(message);
}
import { createRequire } from "module";
import DiscordAPI from "discord.js";
import AuthConnect from "authconnect-djs";
import {DISCORD_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SEND_CROSSPLATFORM_URL, FIREBASE_DATABASE_URL} from "./config.js";
import firebase from "firebase-admin";
import Spotify from "./helpers/spotify.js";
import Youtube from "./helpers/youtube.js";
import DataManager from "./helpers/dataManager.js";
const require = createRequire(import.meta.url);
const serviceAccount = require("./firebase-admin-key.json");

const bot = new DiscordAPI.Client();

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: FIREBASE_DATABASE_URL
})
const firestore = firebase.firestore();

let auth, spotify, youtube, dataManager;
let logChannel = null;
const linkerMembers = {};

bot.login(DISCORD_TOKEN);

const onLinked = async (platform, guildId) => {
    if(!linkerMembers[guildId]) return;
    await linkerMembers[guildId].send(`Your ${platform} account has been linked to your server.`);
    if(!await auth.isGuildLoggedIn("google", guildId)) {
        await linkerMembers[guildId].send("To finish linking your accounts, click the Google authentication URL above!");
    } else if(!await auth.isGuildLoggedIn("spotify", guildId)) {
        await linkerMembers[guildId].send("To finish linking your accounts, click the Spotify authentication URL above!");
    } else {
        await linkerMembers[guildId].send("Your accounts have been linked! You're almost there-just two more steps.\n1. From Youtube, copy the URL of your playlist, and run `!setyt <url>` _in your server_.\n2. From Spotify, press Share on your playlist, copy the URL, and run `!setspot <url>` _in your server_.");
    }
}

bot.on("ready", () => {
    console.log("Bot connected to Discord.");
    if(process.env.NODE_ENV === "development") console.log("## Running in Development environment ##\n## Songs will not be added to playlists ##");
    auth = new AuthConnect({
        google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET
        },
        spotify: {
            clientId: SPOTIFY_CLIENT_ID,
            clientSecret: SPOTIFY_CLIENT_SECRET
        }
    });
    auth.useFirestoreDataHandlers(firestore, "playlist_auth_data");
    auth.setLinkedCallback(onLinked);
    spotify = new Spotify(auth);
    youtube = new Youtube(auth);
    dataManager = new DataManager(firestore);
});

bot.on("message", async (message) => {
    if(message.author.bot) return;
    if(!message.guild) return;
    const cmd = message.content.trim();
    if(cmd.toLowerCase() === "!login") {
        if(!message.member.permissions.has("ADMINISTRATOR")) {
            await message.channel.send("Only administrators can run this command.");
            return;
        }
        const youtubeURL = auth.generateAuthURL("google", message.guild.id, "https://www.googleapis.com/auth/youtube");
        const spotifyURL = auth.generateAuthURL("spotify", message.guild.id, "playlist-modify-public playlist-modify-private");
        linkerMembers[message.guild.id] = message.member;
        await message.member.createDM();
        await message.member.send(`Please log in to Youtube and Spotify by clicking both links below:\n\n1. <${youtubeURL}>\n\n2. <${spotifyURL}>`);
        await message.channel.send("I've sent you a DM with the login links! ❤️💚");
        return;
    }
    if(cmd.match(/^!setyt/i)) {
        const split = cmd.split(" ");
        if(split.length < 2) {
            await message.channel.send("Please provide the URL of your Youtube Music playlist.");
            return;
        }
        const url = split[1];
        const id = youtube.getPlaylistIdFromURL(url);
        if(!id) {
            await message.channel.send("Sorry, that doesn't look like a valid Youtube Music playlist URL. It should start with `https://music.youtube.com/playlist?list=`. To get your URL, hit Share on your playlist.");
            return;
        }
        await dataManager.updatePlaylistId("youtube", message.guild.id, id);
        message.channel.send(`Set Youtube Music playlist! ID of playlist: \`${id}\``);
        return;
    }
    if(cmd.match(/^!setspot/i)) {
        const split = cmd.split(" ");
        if(split.length < 2) {
            await message.channel.send("Please provide the URL of your Spotify playlist.");
            return;
        }
        const url = split[1];
        const id = spotify.getPlaylistIdFromURL(url);
        if(!id) {
            await message.channel.send("Sorry, that doesn't look like a valid Spotify playlist URL. It should start with `https://open.spotify.com/playlist/`. To get your URL, hit Share on your playlist.");
            return;
        }
        await dataManager.updatePlaylistId("spotify", message.guild.id, id);
        message.channel.send(`Set Spotify playlist! ID of playlist: \`${id}\``);
        return;
    }
    checkForLink(message);
});

const checkForLink = async (message) => {
    const ignore = message.content.includes("!ignore");
    const spotifyId = spotify.getTrackIdFromURL(message.content);
    const ytId = youtube.getTrackIdFromURL(message.content);
    const spotifyPlaylistId = await dataManager.getPlaylistId("spotify", message.guild.id);
    const youtubePlaylistId = await dataManager.getPlaylistId("youtube", message.guild.id);
    if(spotifyId !== null || ytId !== null) {
        const isLoggedInToBoth = await auth.isGuildLoggedIn("google", message.guild.id) && await auth.isGuildLoggedIn("spotify", message.guild.id);
        if(!isLoggedInToBoth) {
            await message.channel.send("Before you can add songs, an admin needs to log in by running the command `!login`.");
            return;
        }
        const bothPlaylistIdsSet = spotifyPlaylistId && youtubePlaylistId;
        if(!bothPlaylistIdsSet) {
            await message.channel.send("Before you can add songs, an admin needs to set the links to the playlists by running the commands `!setyt <url>` and `!setspot <url>`.");
            return;
        }
    }

    if(spotifyId !== null){
        // Link is Spotify
        const {name, artist, spotifyURI} = await spotify.getTrackById(spotifyId, message.guild.id);
        
        if(process.env.NODE_ENV !== "development" && !ignore) {
            spotify.addToPlaylist(spotifyURI, message.guild.id, spotifyPlaylistId).then(() => {
                message.react("💚");
            });
        }

        youtube.searchForSong(name, artist, message.guild.id).then(async searchRes => {
            if(searchRes == null) return;
            if(SEND_CROSSPLATFORM_URL) message.channel.send(`❤️ YouTube Music link for **${searchRes[0].name}**\n${searchRes[0].url}`);
            if(process.env.NODE_ENV !== "development" && !ignore){
                await youtube.addToPlaylist(searchRes[0].youtubeId, message.guild.id, youtubePlaylistId);
                message.react("❤️");
            }
        });
        
        return;
    }
    if(ytId !== null){
        // Link is Youtube
        const {name, artist, youtubeId} = await youtube.getTrackById(ytId, message.guild.id);
        
        if(process.env.NODE_ENV !== "development" && !ignore) {
            youtube.addToPlaylist(youtubeId, message.guild.id, youtubePlaylistId).then(() => {
                message.react("❤️");
            });
        }

        spotify.searchForSong(name, artist, message.guild.id).then(async searchRes => {
            if(searchRes == null) return;
            if(SEND_CROSSPLATFORM_URL) message.channel.send(`💚 Spotify link for **${searchRes[0].name}**\n${searchRes[0].url}`);
            if(process.env.NODE_ENV !== "development" && !ignore){
                await spotify.addToPlaylist(searchRes[0].spotifyURI, message.guild.id, spotifyPlaylistId);
                message.react("💚");
            }
        })
        return;
    }
}

bot.on('guildCreate', guild => {
    let found = false;
    guild.channels.cache.forEach((channel) => {
        if(found) return;
        if(channel.type === "text" && channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
            channel.send("Thanks for inviting me!\n\nI help compile Spotify and Youtube Music playlists—just send a song in Discord, and I'll add it to both services!\n\nTo get started, have an admin run `!login` in this server to link their Spotify and Youtube accounts for this server.");
            found = true;
        }
    })
});

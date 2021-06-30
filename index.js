import DiscordAPI from "discord.js";
import {DISCORD_TOKEN} from "./secrets";

const bot = new DiscordAPI.Client();
bot.login(DISCORD_TOKEN);

bot.on("ready", () => {
    console.log("Bot connected to Discord.");
})
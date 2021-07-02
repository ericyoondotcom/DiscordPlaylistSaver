# DiscordPlaylistSaver
Sned song link, save to Youtube + Spotify playlists

## Get Started
1. Make a copy of `config.template.js` to `config.js`.
2. Paste your Discord Bot's token into the `DISCORD_TOKEN` field.
3. Copy the ID of the channel you want messages sent to, and paste in `LOGGING_CHANNEL`.
4. You do not have to touch `REDIRECT_URL` since users are instructed to directly paste the link into Discord.
5. Sign up for a Spotify Developer account, create a new project, and paste the relevant values into `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. You will have to add whatever link is in `REDIRECT_URL` as an authorized redirect URI in the Spotify console.
6. Create a new Google Cloud project, configure the OAuth consent screen, and create a new OAuth Client ID credential [here](https://console.cloud.google.com/apis/credentials). Fill out `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
7. Create a Spotify playlist and a Youtube playlist, and copy their IDs (you can get them as portions of the shareable URLs); paste them into the relevant fields
8. When you first run your bot, it will ask you to click on two links. Follow instructions by copying the resulting link after you complete Spotify and Youtube auth flows.
    - Note: Youtube auth only seems to work the first time, e.g. if you run the auth flow again after you have already authorized the app, it will not work. If you need to relink, go to myaccount.google.com, revoke your app's access, and relink.
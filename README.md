# DiscordPlaylistSaver
Sned song link, save to Youtube Music + Spotify playlists

## Get Started
### Config file
- Make a copy of `config.template.js` to `config.js`.

### Discord bot
- Create a new app from the Discord Developers portal. Copy the token.
- Paste your Discord Bot's token into the `DISCORD_TOKEN` field.

### Spotify
- Sign up for a Spotify Developer account, create a new project, and paste the relevant values into `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
- Add `https://authconnect-djs.web.app/redir.html` as an authorized redirect URI in your Spotify project.

### Firebase
- Create a Firebase project and create an admin service account.
- Download the admin service account credentials into a file named `firebase-admin-key.json`.
- Copy the database URL and paste it into `FIREBASE_DATABASE_URL`.

### Google Cloud
- Create a new Google Cloud project, configure the OAuth consent screen, and create a new OAuth Client ID credential [here](https://console.cloud.google.com/apis/credentials).
- Add `https://authconnect-djs.web.app/redir.html` as an authorized redirect URI in your Google Cloud credential.
7. Remember to enable the Youtube Data API from the Google Cloud API Library page!

### Putting it all together
- Create a Spotify playlist and a Youtube Music playlist, and copy their IDs (you can get them as portions of the shareable URLs); paste them into the relevant fields
- Run the bot using `npm start`
- Invite the bot to your server using the link provided by the Discord Developers portal.
- The bot will instruct you to run the `login` command, and two auth URLs will be sent to your DMs. Open both links in the browser to link your account.
- Now, when you send a song link to any channel in the server, it will add the song to both Youtube Music and Spotify playlists!~
- You can include `!ignore` in your message to prevent the bot from adding the song to the playlists.
import fs from "fs";
import fetch from "node-fetch";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import {SPOTIFY_CLIENT_ID, GOOGLE_CLIENT_ID, SPOTIFY_CLIENT_SECRET, GOOGLE_CLIENT_SECRET, REDIRECT_URL} from "../config.js";

const generateRandomString = () => Math.random().toString(36).substring(7);

export default class OAuthManager {
    constructor(logMessage){
        this.__dirname = dirname(fileURLToPath(import.meta.url));
        this.filePath = join(this.__dirname, "authdata.json");
        this.logMessage = logMessage;
        this.currentStates = [];

        this.loadDataFromDisk().then(() => {
            if(this.data == null || this.data.spotify == undefined || this.data.spotify.refreshToken == undefined){
                const random = generateRandomString();
                this.currentStates.push(random);
                const spotifyURL = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URL)}&scope=playlist-modify-private%20playlist-modify-public&state=${random}`;
                logMessage(`Spotify is not linked! To link, navigate to\n<${spotifyURL}>\nthen use \`linkspotify https://your_redirected_url.com\`.`);
            }
            if(this.data == null || this.data.youtube == undefined || this.data.youtube.refreshToken == undefined){
                const random = generateRandomString();
                this.currentStates.push(random);
                const youtubeURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URL)}&scope=${encodeURIComponent("https://www.googleapis.com/auth/youtube")}&access_type=offline&state=${random}`;
                logMessage(`Youtube is not linked! To link, navigate to\n<${youtubeURL}>\nthen use \`linkyt https://your_redirected_url.com\`.`);
            }
        });
    }

    loadDataFromDisk = () => {
        return new Promise((resolve, reject) => {
            if(!fs.existsSync(this.filePath)){
                this.data = null;
                resolve();
                return;
            }
            fs.readFile(this.filePath, (err, data) => {
                this.data = JSON.parse(data);
                for(const key of Object.keys(this.data)){
                    if(this.data[key].expiryDate != undefined){
                        this.data[key].expiryDate = new Date(this.data[key].expiryDate);
                    }
                }
                resolve();
                return;
            });
        });
    }

    runAuthFlow = async (service, url) => {
        const params = (new URL(url)).searchParams;
        const state = params.get("state");
        if(!this.currentStates.includes(state)){
            this.logMessage("Invalid state parameter! try again.");
            return;
        }
        const code = params.get("code");
        let authCodeExchangeURL = service === "spotify" ? "https://accounts.spotify.com/api/token" : "https://oauth2.googleapis.com/token";
        const result = await fetch(authCodeExchangeURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: REDIRECT_URL,
                client_id: service === "spotify" ? SPOTIFY_CLIENT_ID : GOOGLE_CLIENT_ID,
                client_secret: service === "spotify" ? SPOTIFY_CLIENT_SECRET : GOOGLE_CLIENT_SECRET
            })
        });
        const json = await result.json();
        if(this.data == null) this.data = {};
        if("error" in json){
            this.logMessage("Error returned by authorization exchange endpoint!");
            console.log(json);
            return;
        }
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + json.expires_in);
        this.data[service] = {
            refreshToken: json.refresh_token,
            accessToken: json.access_token,
            expiryDate
        };
        await this.saveData();
        this.logMessage("Service " + service + " successfully linked.");
    }

    refreshToken = async (service) => {
        if(this.data == null || !(service in this.data) || this.data[service].refreshToken == undefined){
            return;
        }
        const result = await fetch(service === "spotify" ? "https://accounts.spotify.com/api/token" : "https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: this.data[service].refreshToken,
                client_id: service === "spotify" ? SPOTIFY_CLIENT_ID : GOOGLE_CLIENT_ID,
                client_secret: service === "spotify" ? SPOTIFY_CLIENT_SECRET : GOOGLE_CLIENT_SECRET
            })
        });
        const json = await result.json();
        if("error" in json){
            this.logMessage("Error returned by refresh token endpoint!");
            console.log(json);
            return;
        }
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + json.expires_in);
        this.data[service].accessToken = json.access_token;
        this.data[service].expiryDate = expiryDate;
        await this.saveData();
        console.log("Refreshed access token: " + service);
    }

    saveData = () => {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.filePath, JSON.stringify(this.data, null, "\t"), e => {
                if(e) throw e;
                resolve();
            });
        });
    }

    getAccessToken = async (service) => {
        if(this.data == null) return;
        if(this.data[service] == undefined) return;
        if(this.data[service].accessToken == undefined || this.data[service].expiryDate.getTime() - Date.now() <= 0){
            await this.refreshToken(service);
        }
        return `Bearer ${this.data[service].accessToken}`;
    } 
}
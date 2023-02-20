export default class DataManager {
    guildData = {};

    constructor(firestore) {
        this.firestore = firestore;
    }

    getGuildData = async (guildId) => {
        if(guildId in this.guildData) {
            return this.guildData[guildId];
        }
        let doc;
        try {
            doc = await this.firestore.collection("playlist_saver").doc(guildId).get();
        } catch(e) {
            console.error(e);
            return null;
        }
        if(!doc.exists) {
            this.guildData[guildId] = {};
        } else {
            this.guildData[guildId] = doc.data();
        }
        return this.guildData[guildId];
    }

    updatePlaylistId = async (service, guildId, playlistId) => {
        if(!(guildId in this.guildData)) this.guildData[guildId] = {};
        if(!("playlistIds" in this.guildData[guildId])) this.guildData[guildId].playlistIds = {};
        this.guildData[guildId].playlistIds[service] = playlistId;
        try {
            this.firestore.collection("playlist_saver").doc(guildId).set({
                playlistIds: {
                    [service]: playlistId
                }
            }, {merge: true});
        } catch(e) {
            console.error(e);
            return;
        }
    }

    getPlaylistId = async (service, guildId) => {
        const data = await this.getGuildData(guildId);
        if(!data.playlistIds || !data.playlistIds[service]) {
            return null;
        }
        return data.playlistIds[service];
    }
}
const playersUrl = 'https://battlelog.battlefield.com/bf3/servers/getPlayersOnServer/pc'

//tracking current server calls to not overlap
const serversBeingCalled = new Map()

async function _getPlayers(id) {
    try {
        const req = await fetch(`${playersUrl}/${id}/`, { method: 'GET' })
        const { players } = await req.json()
        return players
    } catch (err) {
        console.error(err)
        return null
    }
}

async function _handleServerPlayers(req) {
    serversBeingCalled.set(req.guid, true)
    const players = await _getPlayers(req.guid)
    return { ...req, players }
}

chrome.runtime.onMessage.addListener((req, sender, sendRes) => { 

    _handleServerPlayers(req).then(res => {
        sendRes(res)
        serversBeingCalled.delete(req.guid)
    })
    return true;
})
const TEXT_COLOR = "#308dbf"

//use to track which servers we've already got players for
let serverMap = {}

// Server List functions

function _shouldIgnoreServer(el) {
    const playersContainer = el.querySelector('.serverguide-cell-players')
    const realPlayers = playersContainer.querySelector('#real-count')
    const guid = el.getAttribute('guid')

    const filterServer = 
        (!realPlayers ||
        (!(guid in serverMap) || playersContainer.classList.contains('active')))
        &&
        Number(playersContainer.innerText.split('/')[0]) > 5

    return filterServer
}

function _getServerRows() {
    const rows = document.querySelectorAll('.serverguide-bodycells')
    return Array.from(rows).filter(_shouldIgnoreServer)
}

function _setupNewPlayersAmount(guid) {
    let maxPlayers;
    const rows = document.querySelectorAll(`[guid='${guid}']`)
    const mappedRows = []

    Array.from(rows).forEach((row, i) => {
        // deleting duplicated server rows
        if (i > 0) {
            row.remove()
            return
        }
        const playerCountContainer = row.querySelector('.serverguide-cell-players')
        playerCountContainer.style.display = 'flex'
        playerCountContainer.style.flexDirection = 'column'
        playerCountContainer.style.lineHeight = '20px'
        maxPlayers = playerCountContainer.querySelector('span').innerText.split('/')[1]

        mappedRows.push({
            playerCountContainer,
            maxPlayers: Number(maxPlayers.split('[')[0].trim())
        })
    }) 

    return mappedRows
}

function serverListMutationCallback() {
    const elements = _getServerRows()

    Array.from(elements).forEach((el) => {
        const guid = el.getAttribute('guid')
        chrome.runtime.sendMessage({ guid }, serverListSendMessageCallback)
    })
}

function serverListSendMessageCallback(res) {
    if (res.players == null) {
        return
    }
    const mappedRows = _setupNewPlayersAmount(res.guid)

    for (const { playerCountContainer, maxPlayers } of mappedRows) {
        const newCount = playerCountContainer.querySelector('#real-count')
        const playersNum = Math.min(res.players.length, maxPlayers)
        
        //Update existing count element
        if (newCount) {
            newCount.innerText = `${playersNum} / ${maxPlayers}`
            return
        }
        
        const newPlayerCount = document.createElement('span')
        newPlayerCount.id = 'real-count'
        newPlayerCount.innerText = `${playersNum} / ${maxPlayers}`
        newPlayerCount.style.fontWeight = 'bold'
        newPlayerCount.style.color = TEXT_COLOR
        playerCountContainer.appendChild(newPlayerCount)
    
        serverMap[res.guid] = playersNum
    }
}

// Server Page functions

function _handleInsertNewPlayers(players) {
    const playersContainer = document.querySelector('#server-info-players')
    if (!playersContainer) return

    const newCount = document.querySelector('#real-count')
    if (newCount) {
        const clone = playersContainer.cloneNode(true);
        const span = clone.querySelector('#real-count');
        clone.removeChild(span);
        const maxPlayers = clone.innerText?.split('/')[1].trim();

        newCount.innerText = `${players} / ${maxPlayers}`
        return
    }
    
    const maxPlayers = playersContainer.innerText?.split('/')[1].trim()
    const newPlayerCount = document.createElement('span')
    newPlayerCount.id = 'real-count'
    newPlayerCount.innerText = `${players} / ${maxPlayers}`
    newPlayerCount.style.fontWeight = 'bold'
    newPlayerCount.style.color = TEXT_COLOR
    newPlayerCount.style.marginLeft = '5px'
    playersContainer.appendChild(newPlayerCount)
}

function serverPageMutationCallback() {
    const newCount = document.querySelector('#real-count')
    if (newCount) return
    
    const { href } = window.location
    const guid = href.split('show/pc/')[1].split('/')[0]

    //re-use the existing player value while we get a new one
    if (guid in serverMap) {
        _handleInsertNewPlayers(serverMap[guid])
    }

    chrome.runtime.sendMessage({ guid }, serverPageSendMessageCallback)
}

function serverPageSendMessageCallback(res) {
    if (res.players == null) {
        return
    }
    _handleInsertNewPlayers(res.players.length)
}

const observer = new MutationObserver(() => {
    if (window.location.href.includes('/servers/show')) {
        serverPageMutationCallback()
    } else {
        serverListMutationCallback()
    }
})
observer.observe(document, { childList: true, subtree: true })

chrome.runtime.onMessage.addListener(serverListSendMessageCallback)
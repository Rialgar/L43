const svgNS = 'http://www.w3.org/2000/svg';
const hexHref = './base.svg#hexagon'
const dx = 86.6025;

const highlight = document.createElementNS(svgNS, 'g');
highlight.setAttribute('class', 'highlight')

const tileTypes = [
    {
        name: 'Plains',
        description: 'Easy to traverse, but hardly any resources.',
        risk: 0,
        resources: [0,5]
    },
    {
        name: 'Rocks',
        description: 'Low risk, little ressources.',
        risk: 5,
        resources: [5, 10]
    },
    {
        name: 'Hills',
        description: 'Medium risk, a few ressources.',
        risk: 10,
        resources: [10, 20],
    },
    {
        name: 'Mountains',
        description: 'High risk, many resources.',
        risk: 20,
        resources: [20, 40],
    }
]

const game = {
    people: 500,
    food: 8000,
    fuel: 5,
    carbon: 0,
    day: 0
}
const tiles = [];
let currentTile = null;
let ui;

const intro = [
    'You have landed on a foreign planet. Your fuel is spent and your rations are limited.',
    'To create new food or fuel you need to extract carbon from the planet and convert it. You can explore regions adjacent to already discovered regions or gather carbon from explored areas.',
    'Gathering carbon in risky areas can result in casulties. If all crewmembers die, you lose.',
    'Gathering carbon or exploring an area takes time. You need 1 food per 10 people to keep them alive each day.',
    'If you manage to collect 1000 fuel, you can fly home.'
];
let introslide = 0;

const showIntro = () => {
    if(introslide >= intro.length){
        hideMenu();
    } else {        
        showMenu('Intro', intro[introslide], [
            {
                text: 'OK',
                callback: showIntro
            }
        ]);
        introslide++;
    }
}

window.addEventListener('load', () => {
    const svg = document.getElementById('board');
    const highlightHex = document.createElementNS(svgNS, 'use');
    highlightHex.setAttribute('href', hexHref);
    highlightHex.setAttribute('href', hexHref);
    highlight.appendChild(highlightHex);
    
    for(let x = 0; x < 20; x++){
        tiles[x] = [];
        for(let y = 0; y < 13 - x%2; y++){
            const tile = {
                x: x,
                y: y,
                elementX: x * dx,
                elementY: 100 * (y + (x%2)/2)
            };
            tiles[x][y] = tile; 
            const element = document.createElementNS(svgNS, 'use');
            element.setAttribute('href', hexHref);
            element.addEventListener('mouseover', () => { mouseover(tile) });
            
            const group = document.createElementNS(svgNS, 'g')
            group.setAttribute('transform', `translate(${tile.elementX} ${tile.elementY})`)
            group.appendChild(element);
            group.addEventListener('click', () => { click(tile) });
            //group.appendChild(makeText(`${x}, ${y}`));
            svg.appendChild(group);

            tile.svgGroup = group;
        }   
    }

    const shipTile = tiles[9][6];

    shipTile.type = 'ship';
    shipTile.svgGroup.appendChild(makeText('Ship'));
    shipTile.svgGroup.setAttribute('class', 'ship');

    let nextTiles = [shipTile];
    let distance = 0;
    while(nextTiles.length > 0){
        const nextNeighbours = [];
        for (const tile of nextTiles) {
            tile.distance = distance;
            nextNeighbours.push.apply(nextNeighbours, neighbours(tile.x, tile.y));
        }
        nextTiles = nextNeighbours.filter(tile => typeof(tile.distance) === 'undefined');
        distance = distance + 1;
    }

    /*for(let x = 0; x < tiles.length; x++){
        for(let y = 0; y < tiles[x].length; y++){
            tiles[x][y].svgGroup.appendChild(makeText(tiles[x][y].distance));
        }
    }*/

    svg.appendChild(highlight);

    highlight.appendChild(makeText('search'));
    highlight.addEventListener('click', () => {
        if(currentTile){
            click(currentTile);
        }
    });

    ui = document.getElementById('ui');
    ui.addEventListener('mouseover', () => {
        ui.classList.toggle('down');
    });

    updateUI();

    showIntro();
});

const makeText = string => {
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = string;

    return text;
}

const getTile = (x, y) => {
    return tiles[x] && tiles[x][y];
}

const neighbours = (x, y) => {
    let out;
    if(x%2 == 0){
        out = [
            getTile(x-1, y-1),
            getTile(x-1, y),
            getTile(x, y+1),
            getTile(x+1, y),
            getTile(x+1, y-1),
            getTile(x, y-1)
        ];
    } else {
        out = [
            getTile(x-1, y),
            getTile(x-1, y+1),
            getTile(x, y+1),
            getTile(x+1, y+1),
            getTile(x+1, y),
            getTile(x, y-1)
        ];
    }
    return out.filter(thing => !!thing);
};

const canBeSearched = tile => !tile.type && neighbours(tile.x, tile.y).some(tile => !!tile.type)

const mouseover = tile => {
    currentTile = tile;
    highlight.setAttribute('transform', `translate(${tile.elementX} ${tile.elementY})`);
    if(canBeSearched(tile)){
        highlight.classList.add('explore');
    } else {
        highlight.classList.remove('explore');
    }
}

const click = tile => {
    if(!!tile.type){
        showTileMenu(tile);
    } else if(canBeSearched(tile)) {
        explore(tile);
    }
}

const makeButton = (text, callback) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', callback);
    return button;
}

const showMenu = (title, text, buttons) => {
    const menu = document.getElementById('dialog');
    const menuTitle = document.getElementById('dialogTitle');
    const menuText = document.getElementById('dialogText');
    const menuButtons = document.getElementById('dialogButtons');
    
    menuTitle.textContent = title;
    menuText.textContent = text;
    while(menuButtons.childElementCount > 0){
        menuButtons.removeChild(menuButtons.firstElementChild);
    }

    for(spec of buttons){
        menuButtons.appendChild(makeButton(spec.text, spec.callback));
    }

    menu.style.display = 'block';
}

const hideMenu = () => {
    const menu = document.getElementById('dialog');
    menu.style.display = 'none';
    updateUI();
}

const convertCB = (from, to, factor, amount) => () => {
    const consume = factor * amount;
    if(game[from] < consume){
        showMenu(
            `Not enough ${from}`,
            `You need ${consume} ${from} to create ${amount} ${to}, you only have ${game[from]}`,
            [{
                text: 'OK',
                callback: hideMenu
            }]            
        )
    } else {
        game[from] -= consume;
        game[to] += amount;
        hideMenu();
    }
}

const showResourceMenuCb = (from, to, factor) => () => {
    showMenu(
        `${from} 🡒 ${to}`,
        `Convert ${from} to ${to}. Getting 1 ${to} per ${factor} ${from}`,
        [
            {
                text: 'Cancel',
                callback: hideMenu                
            },
            {
                text: 'Create 1',
                callback: convertCB(from, to, factor, 1)                
            },
            {
                text: 'Create 5',
                callback: convertCB(from, to, factor, 5)
            },
            {
                text: 'Create 10',
                callback: convertCB(from, to, factor, 10)
            },
            {
                text: 'Create 50',
                callback: convertCB(from, to, factor, 50)
            }
        ]
    )
}

const showTileMenu = tile => {
    if(tile.type === 'ship'){
        showMenu('Ship', 'This is your ship. You need 1000 fuel to fly back home. Cou can convert Carbon to Fuel or Food 1-to-1. You can convert food and fuel into each other 10-to-1.', [
            {
                text: 'Close',
                callback: hideMenu
            },
            {
                text: 'Carbon 🡒 Fuel',
                callback: showResourceMenuCb('carbon', 'fuel', 1)
            },
            {
                text: 'Carbon 🡒 Food',
                callback: showResourceMenuCb('carbon', 'food', 1)
            },
            {
                text: 'Fuel 🡒 Food',
                callback: showResourceMenuCb('fuel', 'food', 10)
            },
            {
                text: 'Food 🡒 Fuel',
                callback: showResourceMenuCb('food', 'fuel', 10)
            }
        ])
    } else if (tile.resources === 0) {
        showMenu('Empty', 'There is no carbon to be collected in this area.', [
            {
                text: 'OK',
                callback: hideMenu
            }
        ]);
    } else {
        const verb = tile.resources === 1 ? 'is' : 'are';
        const unit = tile.resources === 1 ? 'unit' : 'units';
        showMenu(tile.type.name, `${tile.type.description} There ${verb} ${tile.resources} ${unit} of carbon left to be gathered.`, [
            {
                text: 'Close',
                callback: hideMenu
            },
            {
                text: 'Gather Carbon',
                callback: gatherResourcesCB(tile)
            }
        ]);
    }
};

const causes = [
    'in an avalanche',
    'tripping over rocks',
    'falling into a hole',
    'when the ground collapsed'
];

const getDeathCause = () => {
    return causes[Math.floor(Math.random()*causes.length)];
}

const gatherResourcesCB = tile => () => {
    const amount = Math.min(tile.resources, Math.max(2, Math.floor(Math.random() * tile.type.resources[1])));
    const dead = Math.min(game.people, Math.floor(Math.random() * tile.type.risk));
    tile.resources -= amount;
    tile.svgText.textContent = tile.resources;
    game.carbon += amount;
    game.people -= dead;
    let deadSentance = 'Nobody died.'
    if(dead === 1){
        deadSentance = `One person died ${getDeathCause()}.`
    } else if(dead > 1) {
        deadSentance = ` ${dead} people died ${getDeathCause()}.`
    }
    advanceTime();
    showMenu(
        'Exploration results',
        `You were able to collect ${amount} carbon. ${deadSentance}`,
        [
            {
                text: 'OK',
                callback: hideMenu
            }
        ]
    )
}

const explore = tile => {
    const type = tileTypes[Math.floor(Math.random()*tileTypes.length)];
    tile.type = type;
    tile.resources = Math.floor(type.resources[0] + Math.random() * (type.resources[1] - type.resources[0]));
    tile.svgGroup.classList.add(type.name);
    tile.svgText = makeText(tile.resources);
    tile.svgGroup.appendChild(tile.svgText);
    mouseover(tile);
    advanceTime();
}

const advanceTime = () => {
    if(game.food * 10 > game.people){
        game.food -= Math.floor(game.people/10);
    } else {
        game.people = game.food * 10;
        game.food = 0;
    }
    game.day++;
    updateUI();
}

const updateUI = () => {
    for(const key in game){
        document.getElementById(key).textContent = game[key];
    }
    if(game.fuel >= 1000){
        showMenu('You Won', 'You gathered enough fuel to return home.', [
            {
                text: 'Take Off!',
                callback: ending
            }
        ])
    } else if (game.people <= 0) {
        showMenu('You Lost', 'Everyone died.', [
            {
                text: 'Restart',
                callback: () => window.location.reload()
            }
        ])
    }
}

const ending = () => {
    showMenu('You Won', `You returned home with ${game.people} survivors.`, [
        {
            text: 'Restart',
            callback: () => window.location.reload()
        }
    ])
}
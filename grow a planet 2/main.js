// Set up the 3D scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Give each new planet an integer size from 1 to 5.
let planetSize = Math.floor(Math.random() * 5) + 1;
const planetScale = 2;
let planetRadius = planetSize * planetScale;
const geometry = new THREE.SphereGeometry(planetRadius, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({
    map: createMarsTexture(),
    color: 0xd3b8a0,
    roughness: 0.96,
    metalness: 0
});
const sphere = new THREE.Mesh(geometry, sphereMaterial);
sphere.position.set(0, 0, 0);
scene.add(sphere);
scene.add(new THREE.AmbientLight(0x9b8775, 0.65));
scene.add(new THREE.HemisphereLight(0xd8e9ff, 0x8c5b3b, 0.6));
const sunlight = new THREE.DirectionalLight(0xffc69a, 1);
sunlight.position.set(-planetRadius * 2, planetRadius * 1.5, planetRadius * 3);
scene.add(sunlight);
const fillLight = new THREE.DirectionalLight(0x9dbbe8, 0.55);
fillLight.position.copy(sunlight.position).negate();
scene.add(fillLight);

const planetSizeDisplay = document.getElementById('planet-size');
const moneyDisplay = document.getElementById('money-amount');
const moneyRateDisplay = document.getElementById('money-rate');
const planetUpgradeButton = document.getElementById('planet-upgrade');
const totalTileCountDisplay = document.getElementById('total-tile-count');
const grassSummaryCountDisplay = document.getElementById('grass-summary-count');
const oceanSummaryCountDisplay = document.getElementById('ocean-summary-count');
const forestSummaryCountDisplay = document.getElementById('forest-summary-count');
const grassTileIncomeDisplay = document.getElementById('grass-tile-income');
const oceanTileIncomeDisplay = document.getElementById('ocean-tile-income');
const forestTileIncomeDisplay = document.getElementById('forest-tile-income');
const humanSummaryCountDisplay = document.getElementById('human-summary-count');
const humanTileIncomeDisplay = document.getElementById('human-tile-income');
const grassTileCountDisplay = document.getElementById('grass-tile-count');
const oceanTileCountDisplay = document.getElementById('ocean-tile-count');
const forestTileCountDisplay = document.getElementById('forest-tile-count');
const humanCountDisplay = document.getElementById('human-count');
const humanDetails = document.getElementById('human-details');
const humanDetailsTitle = document.getElementById('human-details-title');
const humanAgeDisplay = document.getElementById('human-age');
const humanAgeBonusDisplay = document.getElementById('human-age-bonus');
const shopToggle = document.getElementById('shop-toggle');
const shopPanel = document.getElementById('shop-panel');
const shopStatus = document.getElementById('shop-status');
const buyGrassButton = document.getElementById('buy-grass');
const buyOceanButton = document.getElementById('buy-ocean');
const buyForestButton = document.getElementById('buy-forest');
const buyHumanButton = document.getElementById('buy-human');
const planetUpgradeCostDisplay = document.getElementById('planet-upgrade-cost');
const shopCategoryButtons = document.querySelectorAll('.shop-category');
const shopCategoryPanels = {
    tiles: document.getElementById('tile-shop-category'),
    humans: document.getElementById('human-shop-category')
};
const controlsHint = document.getElementById('controls-hint');
let money = 0;
let grassTileCount = 0;
let oceanTileCount = 0;
let forestTileCount = 0;
let humanCount = 0;
let planetUpgradeCount = 0;
let selectedHuman = null;
let hoveredHuman = null;
let placementArmed = false;
let placementType = 'grass';
const baseGrassTileCost = 10;
const baseOceanTileCost = 100;
const baseForestTileCost = 500;
const grassTileCostMultiplier = 1.25;
const oceanTileCostMultiplier = 1.25;
const forestTileCostMultiplier = 1.25;
const baseHumanCost = 50;
const humanCostMultiplier = 1.25;
const basePlanetUpgradeCost = 500;
const gridDivisions = planetSize * 4;
const placedTiles = [];
const forestTileMeshes = [];
const tilesByCell = new Map();
const beachStrips = [];
const humans = [];
const humansByHabitatTile = new Map();
const occupiedCells = new Set();
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const humanWalkRaycaster = new THREE.Raycaster();
planetSizeDisplay.textContent = `Size: ${planetSize}`;
moneyDisplay.textContent = '$0.00';

// Camera setup for spectator-style movement around the planet
camera.position.set(0, 0, planetRadius + 8);
camera.lookAt(0, 0, 0);

const keys = {};
const moveSpeed = 8;
const cameraRadius = 0.25;
let collisionRadius = planetRadius + cameraRadius;
let yaw = 0;
let pitch = 0;
let previousFrameTime = 0;
let rightMouseDown = false;

camera.rotation.order = 'YXZ';

renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button !== 2) return;
    event.preventDefault();
    rightMouseDown = true;
    renderer.domElement.setPointerCapture(event.pointerId);
});

renderer.domElement.addEventListener('pointerup', (event) => {
    if (event.button === 2) rightMouseDown = false;
});

renderer.domElement.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    const offset = camera.position.clone().sub(sphere.position);
    const zoomedDistance = offset.length() * Math.exp(event.deltaY * 0.001);
    const minimumDistance = collisionRadius + 0.15;
    const maximumDistance = planetRadius + 250;
    offset.setLength(Math.max(minimumDistance, Math.min(maximumDistance, zoomedDistance)));
    camera.position.copy(sphere.position).add(offset);
}, { passive: false });

document.addEventListener('pointermove', (event) => {
    if (rightMouseDown) {
        const sensitivity = 0.002;
        yaw -= event.movementX * sensitivity;
        pitch -= event.movementY * sensitivity;
        pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
    }
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    if (placementType === 'human') {
        updateHumanPreview();
    } else {
        updateTilePreview();
    }
    updateHumanHover();
});

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'escape' && placementArmed) {
        placementArmed = false;
        previewTile.visible = false;
        humanPreview.visible = false;
        planetGrid.visible = false;
        controlsHint.textContent = 'Hold right-click to look around · WASD to move · Scroll to zoom';
        shopStatus.textContent = 'Placement cancelled. No money was spent.';
        return;
    }
    if (['w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        keys[key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('blur', () => {
    rightMouseDown = false;
    for (const key of Object.keys(keys)) {
        keys[key] = false;
    }
});

shopToggle.addEventListener('click', () => {
    shopPanel.hidden = !shopPanel.hidden;
    shopToggle.setAttribute('aria-expanded', String(!shopPanel.hidden));
});

document.getElementById('shop-close').addEventListener('click', () => {
    shopPanel.hidden = true;
    shopToggle.setAttribute('aria-expanded', 'false');
});

document.getElementById('human-details-close').addEventListener('click', () => {
    if (selectedHuman) {
        selectedHuman.selected = false;
        if (hoveredHuman === selectedHuman) hoveredHuman = null;
        selectedHuman.highlighted = false;
        updateHumanAppearance(selectedHuman);
    }
    humanDetails.hidden = true;
    selectedHuman = null;
    renderer.domElement.style.cursor = '';
});

renderer.domElement.addEventListener('click', (event) => {
    if (placementArmed || humans.length === 0) return;
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const targets = humans.map((human) => human.pickTarget);
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (selectedHuman) {
        selectedHuman.selected = false;
        updateHumanAppearance(selectedHuman);
    }
    selectedHuman = hit?.object.userData.human || null;
    if (!selectedHuman) {
        humanDetails.hidden = true;
        return;
    }
    selectedHuman.selected = true;
    hoveredHuman = selectedHuman;
    updateHumanAppearance(selectedHuman);
    updateHumanDetails();
});

for (const button of shopCategoryButtons) {
    button.addEventListener('click', () => {
        const selectedCategory = button.dataset.shopCategory;
        for (const categoryButton of shopCategoryButtons) {
            const selected = categoryButton === button;
            categoryButton.classList.toggle('active', selected);
            categoryButton.setAttribute('aria-pressed', String(selected));
        }
        for (const [category, panel] of Object.entries(shopCategoryPanels)) {
            panel.hidden = category !== selectedCategory;
        }
    });
}

buyGrassButton.addEventListener('click', () => startTilePlacement('grass'));
buyOceanButton.addEventListener('click', () => startTilePlacement('ocean'));
buyForestButton.addEventListener('click', () => startTilePlacement('forest'));
buyHumanButton.addEventListener('click', startHumanPlacement);
planetUpgradeButton.addEventListener('click', purchasePlanetUpgrade);

function startTilePlacement(type) {
    const cost = getTileCost(type);
    if (money < cost) {
        const article = type === 'ocean' ? 'an' : 'a';
        shopStatus.textContent = `You need $${cost.toFixed(2)} to buy ${article} ${type} tile.`;
        return;
    }
    placementType = type;
    placementArmed = true;
    humanPreview.visible = false;
    shopPanel.hidden = true;
    shopToggle.setAttribute('aria-expanded', 'false');
    shopStatus.textContent = 'Choose an empty grid cell on your planet. Red cells are already occupied.';
    controlsHint.textContent = `Click an empty planet grid cell to place ${type} · Scroll to zoom · Esc to cancel`;
    planetGrid.visible = true;
    updateTilePreview();
}

function startHumanPlacement() {
    const cost = getHumanCost();
    if (money < cost) {
        shopStatus.textContent = `You need $${cost.toFixed(2)} to buy a human.`;
        return;
    }
    if (![...tilesByCell.values()].some((tile) =>
        isHumanHabitat(tile.type) && hasOpenHumanSpot(tile.cell.key)
    )) {
        shopStatus.textContent = 'Place grass or a forest with an open spot in its connected habitat first.';
        return;
    }

    placementType = 'human';
    placementArmed = true;
    shopPanel.hidden = true;
    shopToggle.setAttribute('aria-expanded', 'false');
    planetGrid.visible = true;
    previewTile.visible = false;
    shopStatus.textContent = 'Place the preview on grass, forest, or sandy beach. Each connected grass or forest tile adds 3 human spots.';
    controlsHint.textContent = 'Click grass, forest, or sand to place a human · Scroll to zoom · Esc to cancel';
    updateHumanPreview();
}

renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !placementArmed) return;
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    if (placementType === 'human') {
        updateHumanPreview();
        placeHumanAtPointer();
        return;
    }
    updateTilePreview();
    if (!previewTile.visible || !previewTile.userData.valid) return;

    money -= getTileCost(placementType);
    if (placementType === 'grass') {
        grassTileCount += 1;
    } else if (placementType === 'ocean') {
        oceanTileCount += 1;
    } else {
        forestTileCount += 1;
    }
    const cell = previewTile.userData.cell;
    const tileMaterial = placementType === 'grass'
        ? grassMaterial
        : placementType === 'ocean'
            ? oceanMaterial
            : forestMaterial;
    const forestPatch = placementType === 'forest'
        ? previewTile.userData.forestPatch
        : null;
    const tileGeometry = forestPatch
        ? createForestGeometry(cell, forestPatch, 0.035)
        : createTileGeometry(cell.face, cell.row, cell.column, 0.022);
    const tile = new THREE.Mesh(tileGeometry, tileMaterial);
    tile.position.copy(sphere.position);
    tile.userData.cellKey = cell.key;
    tile.userData.type = placementType;
    if (forestPatch) tile.userData.forestPatch = forestPatch;
    scene.add(tile);
    if (placementType === 'forest') forestTileMeshes.push(tile);
    let detailMesh = null;
    if (placementType === 'ocean') {
        detailMesh = new THREE.Mesh(createTileGeometry(cell.face, cell.row, cell.column, 0.03), oceanDetailMaterial);
        detailMesh.position.copy(sphere.position);
        scene.add(detailMesh);
    } else if (placementType === 'forest') {
        detailMesh = createForestTrees(cell, forestPatch);
        detailMesh.position.copy(sphere.position);
        scene.add(detailMesh);
    }
    const placedTile = { mesh: tile, detailMesh, cell, type: placementType };
    placedTiles.push(placedTile);
    tilesByCell.set(cell.key, placedTile);
    connectBeachToNeighbors(placedTile);
    occupiedCells.add(cell.key);
    placementArmed = false;
    previewTile.visible = false;
    planetGrid.visible = false;
    controlsHint.textContent = 'Hold right-click to look around · WASD to move · Scroll to zoom';
    const tileName = placementType[0].toUpperCase() + placementType.slice(1);
    shopStatus.textContent = `${tileName} tile placed! Buy another to keep growing your planet.`;
    updateMoneyDisplay();
});

function placeHumanAtPointer() {
    updateHumanPreview();
    if (!humanPreview.visible || !humanPreview.userData.valid) {
        shopStatus.textContent = humanPreview.userData.reason || 'Humans can only be placed on grass, forest, or sandy beaches.';
        return;
    }
    const habitatCellKey = humanPreview.userData.habitatCellKey;
    const habitatTile = tilesByCell.get(habitatCellKey);
    const habitatGroup = getConnectedHumanHabitatTileKeys(habitatCellKey);
    const groupHumanCount = getHumanCountForHabitatGroup(habitatGroup);
    const groupHumanCapacity = habitatGroup.length * 3;
    const cost = getHumanCost();
    if (!habitatTile || !isHumanHabitat(habitatTile.type) || groupHumanCount >= groupHumanCapacity) {
        shopStatus.textContent = 'That connected habitat has no open human spots. Choose another grass or forest area.';
        return;
    }
    if (money < cost) {
        shopStatus.textContent = `You need $${cost.toFixed(2)} to buy a human.`;
        return;
    }

    money -= cost;
    humanCount += 1;
    humansByHabitatTile.set(habitatCellKey, (humansByHabitatTile.get(habitatCellKey) || 0) + 1);
    humans.push(createHuman(habitatTile.cell, humanPreview.position.clone()));
    placementArmed = false;
    humanPreview.visible = false;
    previewTile.visible = false;
    planetGrid.visible = false;
    controlsHint.textContent = 'Hold right-click to look around · WASD to move · Scroll to zoom';
    shopStatus.textContent = `Human placed! This connected habitat has ${groupHumanCount + 1} of ${groupHumanCapacity} human spots filled.`;
    updateMoneyDisplay();
}

function isHumanHabitat(type) {
    return type === 'grass' || type === 'forest';
}

function getConnectedHumanHabitatTileKeys(startCellKey) {
    const startTile = tilesByCell.get(startCellKey);
    if (!startTile || !isHumanHabitat(startTile.type)) return [];

    const connectedKeys = new Set([startCellKey]);
    const pendingCells = [startTile.cell];
    const sides = ['left', 'right', 'top', 'bottom'];
    while (pendingCells.length > 0) {
        const cell = pendingCells.pop();
        for (const side of sides) {
            const neighbor = getNeighborCell(cell, side);
            const neighborTile = tilesByCell.get(neighbor.key);
            if (neighborTile && isHumanHabitat(neighborTile.type) && !connectedKeys.has(neighbor.key)) {
                connectedKeys.add(neighbor.key);
                pendingCells.push(neighborTile.cell);
            }
        }
    }
    return [...connectedKeys];
}

function getHumanCountForHabitatGroup(habitatCellKeys) {
    return habitatCellKeys.reduce(
        (count, cellKey) => count + (humansByHabitatTile.get(cellKey) || 0),
        0
    );
}

function hasOpenHumanSpot(habitatCellKey) {
    const habitatGroup = getConnectedHumanHabitatTileKeys(habitatCellKey);
    return getHumanCountForHabitatGroup(habitatGroup) < habitatGroup.length * 3;
}

function updateHumanPreview() {
    if (!placementArmed || placementType !== 'human') {
        humanPreview.visible = false;
        return;
    }
    raycaster.setFromCamera(pointer, camera);
    const surfaces = [
        ...placedTiles.map((tile) => tile.mesh),
        ...beachStrips,
        sphere
    ];
    const hit = raycaster.intersectObjects(surfaces, false)[0];
    if (!hit) {
        humanPreview.visible = false;
        humanPreview.userData.valid = false;
        humanPreview.userData.reason = 'Aim at the planet to place a human.';
        return;
    }

    const direction = hit.point.clone().sub(sphere.position).normalize();
    const surfacePoint = sphere.position.clone().addScaledVector(direction, planetRadius + 0.045);
    humanPreview.position.copy(surfacePoint);
    humanPreview.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    humanPreview.visible = true;

    const habitatCellKey = hit.object.userData.grassCellKey || hit.object.userData.cellKey;
    const habitatTile = habitatCellKey && tilesByCell.get(habitatCellKey);
    const habitatGroup = habitatCellKey ? getConnectedHumanHabitatTileKeys(habitatCellKey) : [];
    const groupHumanCount = getHumanCountForHabitatGroup(habitatGroup);
    const groupHumanCapacity = habitatGroup.length * 3;
    const isGrassOrForest = hit.object !== sphere
        && habitatTile
        && isHumanHabitat(habitatTile.type)
        && (hit.object === habitatTile.mesh || hit.object.userData.grassCellKey === habitatCellKey);
    const valid = isGrassOrForest && groupHumanCount < groupHumanCapacity && money >= getHumanCost();
    humanPreview.userData.valid = valid;
    humanPreview.userData.habitatCellKey = habitatCellKey || null;
    humanPreview.userData.reason = !isGrassOrForest
        ? 'Humans can only be placed on grass, forest, or sandy beaches.'
        : groupHumanCount >= groupHumanCapacity
            ? 'That connected habitat is full. Choose another habitat or add a grass or forest tile.'
            : money < getHumanCost()
                ? `You need $${getHumanCost().toFixed(2)} to buy a human.`
                : '';
    humanPreview.traverse((object) => {
        if (object.isMesh) object.material.color.set(valid ? 0x8aff9a : 0xff4545);
    });
}

function createHumanVisual(isPreview = false) {
    const group = new THREE.Group();
    group.scale.setScalar(1.5);
    const clothingColors = [0xe3b658, 0xd76c4c, 0x9bb7d1, 0xe6e0cd];
    const previewMaterial = new THREE.MeshBasicMaterial({
        color: 0x8aff9a,
        transparent: true,
        opacity: 0.48,
        depthWrite: false
    });
    const clothingMaterial = isPreview ? previewMaterial : new THREE.MeshStandardMaterial({
        color: clothingColors[Math.floor(seededRandom() * clothingColors.length)],
        roughness: 0.82
    });
    const skinMaterial = isPreview ? previewMaterial : new THREE.MeshStandardMaterial({ color: 0xd9a477, roughness: 0.9 });
    const darkMaterial = isPreview ? previewMaterial : new THREE.MeshStandardMaterial({ color: 0x33291f, roughness: 1 });
    const hairMaterial = isPreview ? previewMaterial : new THREE.MeshStandardMaterial({ color: 0x33291f, roughness: 1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.034, 8), clothingMaterial);
    body.position.y = 0.04;
    group.add(body);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.008, 6), skinMaterial);
    neck.position.y = 0.059;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), skinMaterial);
    head.position.y = 0.061;
    group.add(head);

    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.0125, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
        hairMaterial
    );
    hair.position.y = 0.064;
    group.add(hair);

    const legs = [];
    for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.003, 0.024, 5), darkMaterial);
        leg.position.set(side * 0.0045, 0.012, 0);
        group.add(leg);
        legs.push(leg);

        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.0025, 0.024, 6), clothingMaterial);
        arm.position.set(side * 0.012, 0.041, 0);
        arm.rotation.z = side * -0.22;
        group.add(arm);

        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.012), darkMaterial);
        shoe.position.set(side * 0.0045, 0.002, 0.002);
        group.add(shoe);
    }

    const materials = new Map();
    group.traverse((object) => {
        if (object.isMesh && !materials.has(object.material)) {
            materials.set(object.material, object.material.color.clone());
        }
    });
    return { group, legs, head, hair, materials };
}

function createHuman(cell, placementPoint) {
    const { group, legs, head, hair, materials } = createHumanVisual();
    scene.add(group);
    const human = {
        group,
        cell,
        direction: placementPoint.clone().sub(sphere.position).normalize(),
        targetDirection: placementPoint.clone().sub(sphere.position).normalize(),
        speed: 0.08 + seededRandom() * 0.025,
        phase: seededRandom() * Math.PI * 2,
        legs,
        head,
        hair,
        materials,
        baseScale: 1.5,
        age: 0,
        ageTimer: 2 + seededRandom() * 8,
        highlighted: false,
        selected: false,
        lifeStage: ''
    };
    const pickTarget = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 6),
        new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            colorWrite: false,
            depthWrite: false
        })
    );
    pickTarget.position.y = 0.045;
    pickTarget.userData.human = human;
    group.add(pickTarget);
    human.pickTarget = pickTarget;
    updateHumanAppearance(human);
    chooseHumanDestination(human);
    const surfacePoint = human.direction.clone().multiplyScalar(planetRadius + 0.035);
    group.position.copy(sphere.position).add(surfacePoint);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfacePoint.clone().normalize());
    return human;
}

function chooseHumanDestination(human) {
    const sides = ['left', 'right', 'top', 'bottom'];
    const walkableCells = [];
    const currentTile = tilesByCell.get(human.cell.key);
    if (currentTile && isHumanHabitat(currentTile.type)) walkableCells.push(currentTile);
    for (const side of sides) {
        const neighbor = getNeighborCell(human.cell, side);
        const neighborTile = tilesByCell.get(neighbor.key);
        if (neighborTile && isHumanHabitat(neighborTile.type)) walkableCells.push(neighborTile);
    }

    const habitatDestinations = walkableCells.map((tile) => {
        if (tile.type === 'forest') {
            const patch = tile.mesh.userData.forestPatch;
            const bounds = patch.polygon.reduce((result, point) => ({
                minU: Math.min(result.minU, point.u),
                maxU: Math.max(result.maxU, point.u),
                minV: Math.min(result.minV, point.v),
                maxV: Math.max(result.maxV, point.v)
            }), { minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity });
            for (let attempt = 0; attempt < 30; attempt++) {
                const u = bounds.minU + seededRandom() * (bounds.maxU - bounds.minU);
                const v = bounds.minV + seededRandom() * (bounds.maxV - bounds.minV);
                if (isPointInForestPatch(u, v, patch)) {
                    return getCubeFacePoint(tile.cell.face, u, v).normalize();
                }
            }
            return getCubeFacePoint(tile.cell.face, patch.centerU, patch.centerV).normalize();
        }
        const margin = 0.16;
        const u = -1 + 2 * (tile.cell.column + margin + seededRandom() * (1 - margin * 2)) / gridDivisions;
        const v = 1 - 2 * (tile.cell.row + margin + seededRandom() * (1 - margin * 2)) / gridDivisions;
        return getCubeFacePoint(tile.cell.face, u, v).normalize();
    });
    const walkableGrassKeys = new Set(
        walkableCells.filter((tile) => tile.type === 'grass').map((tile) => tile.cell.key)
    );
    const nearbyBeaches = beachStrips.filter((beach) => walkableGrassKeys.has(beach.userData.grassCellKey));
    const beachDestinations = nearbyBeaches.map((beach) => {
        const positions = beach.geometry.getAttribute('position');
        const segmentCount = positions.count / 4;
        const segment = 1 + Math.floor(seededRandom() * (segmentCount - 2));
        const firstEdge = new THREE.Vector3().fromBufferAttribute(positions, segment * 4 + 1);
        const secondEdge = new THREE.Vector3().fromBufferAttribute(positions, segment * 4 + 2);
        return firstEdge.lerp(secondEdge, 0.25 + seededRandom() * 0.5).normalize();
    });
    const destinations = [...habitatDestinations, ...beachDestinations];
    human.targetDirection.copy(destinations[Math.floor(seededRandom() * destinations.length)]);
}

function isHumanWalkableDirection(direction) {
    const cell = getGridCell(direction);
    const tile = tilesByCell.get(cell.key);
    if (tile?.type === 'grass') {
        return true;
    }
    humanWalkRaycaster.set(sphere.position, direction);
    humanWalkRaycaster.far = planetRadius + 0.1;
    const walkableSurfaces = [...forestTileMeshes, ...beachStrips];
    return humanWalkRaycaster.intersectObjects(walkableSurfaces, false).length > 0;
}

function updateHumans(deltaTime, timeSeconds, elapsedTime = deltaTime) {
    for (const human of humans) {
        if (human.age < 100) {
            human.ageTimer -= elapsedTime;
            while (human.ageTimer <= 0 && human.age < 100) {
                human.age += 1;
                human.ageTimer += 2 + seededRandom() * 8;
                const lifeStage = getHumanLifeStage(human.age);
                if (lifeStage !== human.lifeStage) updateHumanAppearance(human);
                if (human === selectedHuman) updateHumanDetails();
            }
        }

        const isPaused = human === hoveredHuman;
        const angle = human.direction.angleTo(human.targetDirection);
        const isWalking = !isPaused && angle > 0.001;
        if (isWalking) {
            const amount = Math.min(1, human.speed * deltaTime / Math.max(angle, 0.0001));
            const candidateDirection = human.direction.clone().lerp(human.targetDirection, amount).normalize();
            const candidateCell = getGridCell(candidateDirection);
            if (isHumanWalkableDirection(candidateDirection)) {
                human.direction.copy(candidateDirection);
                if (isHumanHabitat(tilesByCell.get(candidateCell.key)?.type)) {
                    human.cell = candidateCell;
                }
            } else {
                const currentCell = getGridCell(human.direction);
                if (isHumanHabitat(tilesByCell.get(currentCell.key)?.type)) {
                    human.cell = currentCell;
                }
                human.targetDirection.copy(human.direction);
                chooseHumanDestination(human);
            }
        } else if (!isPaused && Math.random() < deltaTime * 0.8) {
            chooseHumanDestination(human);
        }

        const surfacePoint = human.direction.clone().multiplyScalar(planetRadius + 0.035);
        const normal = surfacePoint.clone().normalize();
        human.group.position.copy(sphere.position).add(surfacePoint);
        const alignment = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        if (isWalking) {
            const nextPoint = human.targetDirection.clone().multiplyScalar(planetRadius + 0.035);
            const tangent = nextPoint.sub(surfacePoint);
            tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(alignment);
            const yaw = Math.atan2(normal.dot(forward.clone().cross(tangent)), forward.dot(tangent));
            alignment.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
        }
        human.group.quaternion.copy(alignment);
        for (let leg = 0; leg < human.legs.length; leg++) {
            human.legs[leg].rotation.x = isWalking
                ? Math.sin(timeSeconds * 10 + human.phase + leg * Math.PI) * 0.5
                : 0;
        }
    }
}

function getHumanLifeStage(age) {
    if (age < 10) return 'Toddler';
    if (age < 18) return 'Teenager';
    if (age < 60) return 'Adult';
    return 'Old Guy';
}

function updateHumanDetails() {
    if (!selectedHuman) {
        humanDetails.hidden = true;
        return;
    }
    humanDetailsTitle.textContent = getHumanLifeStage(selectedHuman.age);
    humanAgeDisplay.textContent = `Age: ${selectedHuman.age} / 100 years`;
    humanAgeBonusDisplay.textContent = 'Income: Humans do not earn money.';
    humanDetails.hidden = false;
}

function updateHumanHover() {
    if (placementArmed) {
        if (hoveredHuman) {
            hoveredHuman.highlighted = false;
            updateHumanAppearance(hoveredHuman);
            hoveredHuman = null;
        }
        renderer.domElement.style.cursor = '';
        return;
    }

    raycaster.setFromCamera(pointer, camera);
    const targets = humans.map((human) => human.pickTarget);
    const hit = raycaster.intersectObjects(targets, false)[0];
    const nextHoveredHuman = hit?.object.userData.human || null;
    if (nextHoveredHuman === hoveredHuman) return;

    if (hoveredHuman) {
        hoveredHuman.highlighted = false;
        updateHumanAppearance(hoveredHuman);
    }
    hoveredHuman = nextHoveredHuman;
    if (hoveredHuman) {
        hoveredHuman.highlighted = true;
        updateHumanAppearance(hoveredHuman);
    }
    renderer.domElement.style.cursor = hoveredHuman ? 'pointer' : '';
}

function updateHumanAppearance(human) {
    const stage = getHumanLifeStage(human.age);
    const stageScales = {
        Toddler: 0.72,
        Teenager: 0.86,
        Adult: 1,
        'Old Guy': 0.94
    };
    human.lifeStage = stage;
    human.group.scale.setScalar(human.baseScale * stageScales[stage]);
    const headScale = stage === 'Toddler' ? 1.2 : stage === 'Teenager' ? 1.08 : 1;
    human.head.scale.setScalar(headScale);
    human.hair.scale.setScalar(headScale);

    for (const [material, color] of human.materials) {
        material.color.copy(material === human.hair.material && stage === 'Old Guy'
            ? new THREE.Color(0xaaa49a)
            : color);
        if (human.highlighted) material.color.set(0x39ff62);
    }
}

function updateCamera(deltaTime) {
    camera.rotation.set(pitch, yaw, 0);

    const forward = new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
    );
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const movement = new THREE.Vector3();

    if (keys['w']) {
        movement.add(forward);
    }
    if (keys['s']) {
        movement.sub(forward);
    }
    if (keys['d']) {
        movement.add(right);
    }
    if (keys['a']) {
        movement.sub(right);
    }

    if (movement.lengthSq() === 0) return;
    movement.normalize().multiplyScalar(moveSpeed * deltaTime);

    const nextPosition = camera.position.clone().add(movement);
    if (nextPosition.distanceTo(sphere.position) >= collisionRadius) {
        camera.position.copy(nextPosition);
        return;
    }

    // Keep valid movement along the surface when one component is blocked.
    for (const axis of ['x', 'y', 'z']) {
        const component = new THREE.Vector3();
        component[axis] = movement[axis];
        const slidPosition = camera.position.clone().add(component);
        if (slidPosition.distanceTo(sphere.position) >= collisionRadius) {
            camera.position.copy(slidPosition);
        }
    }
}

// Build a soft, layered nebula texture for the distant sky.
const nebulaCanvas = document.createElement('canvas');
nebulaCanvas.width = 2048;
nebulaCanvas.height = 1024;
const nebulaContext = nebulaCanvas.getContext('2d');
const skyGradient = nebulaContext.createLinearGradient(0, 0, 0, nebulaCanvas.height);
skyGradient.addColorStop(0, '#01020a');
skyGradient.addColorStop(0.5, '#050817');
skyGradient.addColorStop(1, '#01020a');
nebulaContext.fillStyle = skyGradient;
nebulaContext.fillRect(0, 0, nebulaCanvas.width, nebulaCanvas.height);

let randomSeed = 8391;
function seededRandom() {
    randomSeed = (randomSeed * 16807) % 2147483647;
    return (randomSeed - 1) / 2147483646;
}

const nebulaColors = [
    [45, 31, 142],
    [26, 55, 145],
    [77, 29, 125],
    [20, 76, 126]
];

function paintNebula(x, y, radiusX, radiusY, color, opacity) {
    const rotation = (seededRandom() - 0.5) * 0.8;
    for (const offset of [-nebulaCanvas.width, 0, nebulaCanvas.width]) {
        nebulaContext.save();
        nebulaContext.translate(x + offset, y);
        nebulaContext.rotate(rotation);
        nebulaContext.scale(radiusX, radiusY);
        const glow = nebulaContext.createRadialGradient(0, 0, 0, 0, 0, 1);
        glow.addColorStop(0, `rgba(${color.join(',')},${opacity})`);
        glow.addColorStop(0.32, `rgba(${color.join(',')},${opacity * 0.7})`);
        glow.addColorStop(0.72, `rgba(${color.join(',')},${opacity * 0.22})`);
        glow.addColorStop(1, `rgba(${color.join(',')},0)`);
        nebulaContext.fillStyle = glow;
        nebulaContext.globalCompositeOperation = 'screen';
        nebulaContext.beginPath();
        nebulaContext.arc(0, 0, 1, 0, Math.PI * 2);
        nebulaContext.fill();
        nebulaContext.restore();
    }
}

const nebulaClouds = [
    [0.08, 0.38], [0.25, 0.68], [0.43, 0.32],
    [0.61, 0.63], [0.79, 0.36], [0.96, 0.67]
];

for (const [centerX, centerY] of nebulaClouds) {
    const centerPixelX = centerX * nebulaCanvas.width;
    const centerPixelY = centerY * nebulaCanvas.height;
    for (let layer = 0; layer < 4; layer++) {
        const color = nebulaColors[Math.floor(seededRandom() * nebulaColors.length)];
        const radiusX = nebulaCanvas.width * (0.07 + seededRandom() * 0.11);
        const radiusY = nebulaCanvas.height * (0.06 + seededRandom() * 0.13);
        paintNebula(
            centerPixelX + (seededRandom() - 0.5) * nebulaCanvas.width * 0.08,
            centerPixelY + (seededRandom() - 0.5) * nebulaCanvas.height * 0.1,
            radiusX,
            radiusY,
            color,
            0.14 + seededRandom() * 0.09
        );
    }
    for (let wisp = 0; wisp < 24; wisp++) {
        const color = nebulaColors[Math.floor(seededRandom() * nebulaColors.length)];
        paintNebula(
            centerPixelX + (seededRandom() - 0.5) * nebulaCanvas.width * 0.19,
            centerPixelY + (seededRandom() - 0.5) * nebulaCanvas.height * 0.22,
            nebulaCanvas.width * (0.008 + seededRandom() * 0.025),
            nebulaCanvas.height * (0.012 + seededRandom() * 0.04),
            color,
            0.12 + seededRandom() * 0.13
        );
    }
}

const nebulaTexture = new THREE.CanvasTexture(nebulaCanvas);
nebulaTexture.wrapS = THREE.RepeatWrapping;
nebulaTexture.needsUpdate = true;
const sky = new THREE.Mesh(
    new THREE.SphereGeometry(950, 64, 32),
    new THREE.MeshBasicMaterial({
        map: nebulaTexture,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false
    })
);
sky.renderOrder = -1;
scene.add(sky);

function createStarField(count, size, colorOptions) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const vertical = seededRandom() * 2 - 1;
        const angle = seededRandom() * Math.PI * 2;
        const horizontal = Math.sqrt(1 - vertical * vertical);
        const distance = 240 + seededRandom() * 100;
        positions[i * 3] = Math.cos(angle) * horizontal * distance;
        positions[i * 3 + 1] = vertical * distance;
        positions[i * 3 + 2] = Math.sin(angle) * horizontal * distance;

        const color = colorOptions[Math.floor(seededRandom() * colorOptions.length)];
        colors[i * 3] = color[0];
        colors[i * 3 + 1] = color[1];
        colors[i * 3 + 2] = color[2];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            size,
            sizeAttenuation: false,
            vertexColors: true,
            transparent: true,
            depthWrite: false
        })
    );
    scene.add(stars);
    return stars;
}

const starField = createStarField(1800, 1.1, [
    [1, 0.68, 0.22],
    [1, 0.8, 0.38],
    [1, 0.91, 0.62],
    [0.82, 0.87, 1]
]);
const brightStarField = createStarField(110, 1.65, [
    [1, 0.66, 0.2],
    [1, 0.79, 0.36],
    [1, 0.91, 0.58]
]);

function createDistantPlanetTexture(style, palette) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = palette.base;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (style === 'bands') {
        for (let y = -12; y < canvas.height + 20; y += 12 + seededRandom() * 25) {
            context.fillStyle = seededRandom() > 0.5 ? palette.accent : palette.light;
            context.globalAlpha = 0.18 + seededRandom() * 0.36;
            context.beginPath();
            context.moveTo(0, y);
            for (let x = 0; x <= canvas.width; x += 32) {
                context.lineTo(x, y + Math.sin(x * 0.018 + y) * (3 + seededRandom() * 8));
            }
            context.lineTo(canvas.width, y + 20);
            context.lineTo(0, y + 20);
            context.closePath();
            context.fill();
        }
        context.globalAlpha = 0.48;
        for (let storm = 0; storm < 9; storm++) {
            const x = seededRandom() * canvas.width;
            const y = seededRandom() * canvas.height;
            context.fillStyle = storm % 2 ? palette.dark : palette.light;
            context.beginPath();
            context.ellipse(x, y, 8 + seededRandom() * 28, 2 + seededRandom() * 8, 0, 0, Math.PI * 2);
            context.fill();
        }
    } else {
        if (style === 'ocean') {
            context.fillStyle = palette.dark;
            for (let land = 0; land < 12; land++) {
                const centerX = seededRandom() * canvas.width;
                const centerY = seededRandom() * canvas.height;
                const radiusX = 12 + seededRandom() * 52;
                const radiusY = 8 + seededRandom() * 28;
                context.beginPath();
                for (let point = 0; point <= 20; point++) {
                    const angle = point / 20 * Math.PI * 2;
                    const roughness = 0.72 + seededRandom() * 0.5;
                    const x = centerX + Math.cos(angle) * radiusX * roughness;
                    const y = centerY + Math.sin(angle) * radiusY * roughness;
                    if (point === 0) context.moveTo(x, y);
                    else context.lineTo(x, y);
                }
                context.closePath();
                context.fill();
                context.fillStyle = palette.accent;
                context.globalAlpha = 0.35;
                context.fill();
                context.globalAlpha = 1;
                context.fillStyle = palette.dark;
            }
        }

        for (let mark = 0; mark < 1500; mark++) {
            const x = seededRandom() * canvas.width;
            const y = seededRandom() * canvas.height;
            context.globalAlpha = 0.08 + seededRandom() * 0.22;
            context.fillStyle = seededRandom() > 0.5 ? palette.light : palette.dark;
            const radius = style === 'ice' ? 1 + seededRandom() * 4 : 0.5 + seededRandom() * 2.5;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    }

    context.globalAlpha = 1;
    const edgeShade = context.createLinearGradient(0, 0, 0, canvas.height);
    edgeShade.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
    edgeShade.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
    edgeShade.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    context.fillStyle = edgeShade;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

function createDistantPlanets() {
    const palettes = [
        { base: '#d99450', accent: '#f2c77b', light: '#ffe0a1', dark: '#9e553e', atmosphere: '#ffc17d' },
        { base: '#4285a8', accent: '#75c1d2', light: '#b5e9e8', dark: '#244a83', atmosphere: '#83d8ef' },
        { base: '#8b65a9', accent: '#b18ac3', light: '#e4c0dc', dark: '#533c83', atmosphere: '#c8a1f0' },
        { base: '#bf5e52', accent: '#e29362', light: '#f4c080', dark: '#713c55', atmosphere: '#ef8a73' },
        { base: '#53a879', accent: '#8bc783', light: '#cbe69a', dark: '#326c71', atmosphere: '#90e0ac' },
        { base: '#5c6fac', accent: '#899bd1', light: '#c2c5ec', dark: '#39466e', atmosphere: '#9caeff' },
        { base: '#d4b56c', accent: '#f0d792', light: '#fff0bd', dark: '#a87954', atmosphere: '#f4d99b' },
        { base: '#4c9caa', accent: '#83d0c7', light: '#c5ead3', dark: '#2e647b', atmosphere: '#8ce2dc' },
        { base: '#b56888', accent: '#df92a5', light: '#f5c7bc', dark: '#704666', atmosphere: '#ed9db8' },
        { base: '#798e9e', accent: '#aab8bc', light: '#e1e4d9', dark: '#4e657b', atmosphere: '#bed7e3' },
        { base: '#d0763d', accent: '#edaa55', light: '#f6d181', dark: '#8e4d48', atmosphere: '#ffb563' },
        { base: '#6e9b62', accent: '#a8bd72', light: '#d9d39a', dark: '#3d6e67', atmosphere: '#b4dc8d' },
        { base: '#7b6a5e', accent: '#ad8a6c', light: '#d1b994', dark: '#494653', atmosphere: '#bd9e83' },
        { base: '#4d78a0', accent: '#73a8c1', light: '#bad6dc', dark: '#344e77', atmosphere: '#89c6e0' }
    ];
    const planets = [];
    const planetCount = 42;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let index = 0; index < planetCount; index++) {
        const palette = palettes[(index * 5) % palettes.length];
        const large = index % 7 === 0;
        const radius = large ? 4 + seededRandom() * 4 : 0.85 + seededRandom() * 2.15;
        const style = index % 4 === 0 ? 'bands' : index % 5 === 1 ? 'ocean' : index % 5 === 2 ? 'ice' : 'rocky';
        const texture = createDistantPlanetTexture(style, palette);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.88,
            metalness: 0
        });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), material);
        mesh.rotation.set(seededRandom() * Math.PI, seededRandom() * Math.PI, seededRandom() * Math.PI);

        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(radius * 1.08, 32, 20),
            new THREE.MeshBasicMaterial({
                color: palette.atmosphere,
                transparent: true,
                opacity: 0.11,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                depthWrite: false
            })
        );
        mesh.add(atmosphere);

        const group = new THREE.Group();
        group.add(mesh);
        if (index % 4 === 1 || index % 7 === 0) {
            const rings = new THREE.Mesh(
                new THREE.RingGeometry(radius * 1.3, radius * (1.8 + seededRandom() * 0.35), 72),
                new THREE.MeshBasicMaterial({
                    color: palette.light,
                    transparent: true,
                    opacity: 0.58,
                    side: THREE.DoubleSide,
                    depthWrite: false
                })
            );
            rings.rotation.x = Math.PI / 2 + (seededRandom() - 0.5) * 0.7;
            rings.rotation.y = (seededRandom() - 0.5) * 0.5;
            group.add(rings);
        }

        const vertical = 1 - 2 * (index + 0.5) / planetCount;
        const horizontal = Math.sqrt(1 - vertical * vertical);
        const angle = index * goldenAngle;
        const direction = new THREE.Vector3(
            Math.cos(angle) * horizontal,
            vertical,
            Math.sin(angle) * horizontal
        );
        planets.push({
            group,
            direction,
            distance: 150 + seededRandom() * 190,
            rotationSpeed: (0.015 + seededRandom() * 0.035) * (seededRandom() > 0.5 ? 1 : -1)
        });
        scene.add(group);
    }
    return planets;
}

const distantPlanets = createDistantPlanets();

function createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.userData = {};
    texture.userData.grassContext = context;
    texture.userData.grassCanvas = canvas;
    texture.userData.grassBlades = [];
    texture.userData.lastUpdated = 0;
    for (let i = 0; i < 1800; i++) {
        const shade = Math.floor(42 + seededRandom() * 75);
        texture.userData.grassBlades.push({
            x: seededRandom() * canvas.width,
            y: seededRandom() * canvas.height,
            height: 5 + seededRandom() * 12,
            bend: (seededRandom() - 0.5) * 2,
            phase: seededRandom() * Math.PI * 2,
            shade,
            alpha: 0.3 + seededRandom() * 0.55,
            width: 0.6 + seededRandom() * 1.2
        });
    }
    drawGrassTexture(texture, 0);

    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function drawGrassTexture(texture, timeSeconds) {
    const { grassCanvas: canvas, grassContext: context, grassBlades } = texture.userData;
    context.fillStyle = '#18371b';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (const blade of grassBlades) {
        const sway = Math.sin(timeSeconds * 2.2 + blade.phase) * 8;
        const shade = blade.shade;
        context.strokeStyle = `rgba(${Math.floor(shade * 0.55)},${shade},${Math.floor(shade * 0.48)},${blade.alpha})`;
        context.lineWidth = blade.width;
        context.beginPath();
        context.moveTo(blade.x, blade.y);
        context.quadraticCurveTo(
            blade.x + blade.bend * 0.4 + sway * 0.35,
            blade.y - blade.height * 0.6,
            blade.x + blade.bend + sway,
            blade.y - blade.height
        );
        context.stroke();
    }

    texture.needsUpdate = true;
}

function createMarsTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const random = Math.random;
    const base = context.createLinearGradient(0, 0, 0, canvas.height);
    base.addColorStop(0, '#783b2b');
    base.addColorStop(0.45, '#a65332');
    base.addColorStop(1, '#542e27');
    context.fillStyle = base;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 90; i++) {
        const x = random() * canvas.width;
        const y = random() * canvas.height;
        const radius = 14 + random() * 80;
        const patch = context.createRadialGradient(x, y, 1, x, y, radius);
        const shade = random() > 0.5 ? '190, 99, 60' : '91, 47, 38';
        patch.addColorStop(0, `rgba(${shade}, ${0.12 + random() * 0.18})`);
        patch.addColorStop(1, 'rgba(116, 59, 45, 0)');
        context.fillStyle = patch;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    for (let i = 0; i < 8500; i++) {
        const x = random() * canvas.width;
        const y = random() * canvas.height;
        const size = 0.4 + random() * 2.2;
        const shade = random() > 0.5 ? '241, 166, 109' : '68, 38, 31';
        context.fillStyle = `rgba(${shade}, ${0.06 + random() * 0.18})`;
        context.fillRect(x, y, size, size);
    }

    for (let i = 0; i < 48; i++) {
        const x = random() * canvas.width;
        const y = random() * canvas.height;
        const radius = 2 + random() * 10;
        const crater = context.createRadialGradient(
            x - radius * 0.2, y - radius * 0.25, radius * 0.12,
            x, y, radius
        );
        crater.addColorStop(0, 'rgba(62, 35, 29, 0.58)');
        crater.addColorStop(0.68, 'rgba(90, 47, 35, 0.34)');
        crater.addColorStop(0.86, 'rgba(231, 151, 96, 0.5)');
        crater.addColorStop(1, 'rgba(125, 61, 42, 0)');
        context.fillStyle = crater;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function createOceanTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const base = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    base.addColorStop(0, '#031c36');
    base.addColorStop(0.48, '#075078');
    base.addColorStop(1, '#032746');
    context.fillStyle = base;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 95; i++) {
        const x = seededRandom() * canvas.width;
        const y = seededRandom() * canvas.height;
        const radius = 12 + seededRandom() * 42;
        const patch = context.createRadialGradient(x, y, 1, x, y, radius);
        patch.addColorStop(0, `rgba(33, 151, 166, ${0.08 + seededRandom() * 0.13})`);
        patch.addColorStop(1, 'rgba(4, 52, 91, 0)');
        context.fillStyle = patch;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    for (let i = 0; i < 125; i++) {
        const x = seededRandom() * canvas.width;
        const y = seededRandom() * canvas.height;
        const length = 8 + seededRandom() * 36;
        const bend = (seededRandom() - 0.5) * 10;
        context.strokeStyle = `rgba(125, 220, 224, ${0.08 + seededRandom() * 0.2})`;
        context.lineWidth = 0.5 + seededRandom() * 1.2;
        context.beginPath();
        context.moveTo(x, y);
        context.quadraticCurveTo(x + length * 0.5, y + bend, x + length, y + bend * 0.3);
        context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function createOceanDetailTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.userData = {};
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    for (let i = 0; i < 150; i++) {
        const x = seededRandom() * canvas.width;
        const y = seededRandom() * canvas.height;
        const length = 12 + seededRandom() * 38;
        const bend = (seededRandom() - 0.5) * 5;
        context.strokeStyle = `rgba(155, 239, 239, ${0.14 + seededRandom() * 0.24})`;
        context.lineWidth = 0.6 + seededRandom() * 1.2;
        context.beginPath();
        context.moveTo(x, y);
        context.quadraticCurveTo(x + length * 0.5, y + bend, x + length, y + bend * 0.25);
        context.stroke();
    }

    return texture;
}

function createBeachTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = '#d1b27d';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 900; i++) {
        const shade = seededRandom() > 0.5 ? '104, 75, 48' : '255, 230, 178';
        context.fillStyle = `rgba(${shade}, ${0.08 + seededRandom() * 0.22})`;
        const size = 0.4 + seededRandom() * 1.5;
        context.fillRect(seededRandom() * canvas.width, seededRandom() * canvas.height, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

const grassMaterial = new THREE.MeshBasicMaterial({
    map: createGrassTexture(),
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1
});
const oceanDetailTexture = createOceanDetailTexture();
const oceanDetailMaterial = new THREE.MeshBasicMaterial({
    map: oceanDetailTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2
});
const beachMaterial = new THREE.MeshBasicMaterial({
    map: createBeachTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3
});
const oceanMaterial = new THREE.MeshBasicMaterial({
    map: createOceanTexture(),
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1
});
const forestMaterial = new THREE.MeshStandardMaterial({
    map: grassMaterial.map,
    color: 0x829b5b,
    roughness: 1,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1
});
const treeTrunkGeometry = new THREE.CylinderGeometry(0.012, 0.018, 0.1, 6);
const treeFoliageGeometry = new THREE.ConeGeometry(0.045, 0.1, 7);
const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x61412b, roughness: 1 });
const treeFoliageMaterial = new THREE.MeshStandardMaterial({ color: 0x496b37, roughness: 1 });
const previewMaterial = new THREE.MeshBasicMaterial({
    color: 0x39ff45,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2
});

function getCubeFacePoint(face, u, v) {
    switch (face) {
        case 0: return new THREE.Vector3(1, v, -u);
        case 1: return new THREE.Vector3(-1, v, u);
        case 2: return new THREE.Vector3(u, 1, -v);
        case 3: return new THREE.Vector3(u, -1, v);
        case 4: return new THREE.Vector3(u, v, 1);
        default: return new THREE.Vector3(-u, v, -1);
    }
}

function getCubeFaceCoordinates(face, direction) {
    switch (face) {
        case 0: return { u: -direction.z / Math.abs(direction.x), v: direction.y / Math.abs(direction.x) };
        case 1: return { u: direction.z / Math.abs(direction.x), v: direction.y / Math.abs(direction.x) };
        case 2: return { u: direction.x / Math.abs(direction.y), v: -direction.z / Math.abs(direction.y) };
        case 3: return { u: direction.x / Math.abs(direction.y), v: direction.z / Math.abs(direction.y) };
        case 4: return { u: direction.x / Math.abs(direction.z), v: direction.y / Math.abs(direction.z) };
        default: return { u: -direction.x / Math.abs(direction.z), v: direction.y / Math.abs(direction.z) };
    }
}

function getSpherePoint(face, u, v, surfaceOffset) {
    return getCubeFacePoint(face, u, v).normalize().multiplyScalar(planetRadius + surfaceOffset);
}

function getGridCell(direction) {
    const absX = Math.abs(direction.x);
    const absY = Math.abs(direction.y);
    const absZ = Math.abs(direction.z);
    let face;
    let u;
    let v;

    if (absX >= absY && absX >= absZ) {
        if (direction.x >= 0) {
            face = 0;
            u = -direction.z / absX;
            v = direction.y / absX;
        } else {
            face = 1;
            u = direction.z / absX;
            v = direction.y / absX;
        }
    } else if (absY >= absZ) {
        if (direction.y >= 0) {
            face = 2;
            u = direction.x / absY;
            v = -direction.z / absY;
        } else {
            face = 3;
            u = direction.x / absY;
            v = direction.z / absY;
        }
    } else if (direction.z >= 0) {
        face = 4;
        u = direction.x / absZ;
        v = direction.y / absZ;
    } else {
        face = 5;
        u = -direction.x / absZ;
        v = direction.y / absZ;
    }

    const column = Math.min(gridDivisions - 1, Math.floor(((u + 1) / 2) * gridDivisions));
    const row = Math.min(gridDivisions - 1, Math.floor(((1 - v) / 2) * gridDivisions));
    return { face, row, column, key: `${face}:${row}:${column}` };
}

function createTileGeometry(face, cellRow, cellColumn, surfaceOffset) {
    const segments = 4;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let gridRow = 0; gridRow <= segments; gridRow++) {
        for (let gridColumn = 0; gridColumn <= segments; gridColumn++) {
            const u = -1 + 2 * (cellColumn + gridColumn / segments) / gridDivisions;
            const v = 1 - 2 * (cellRow + gridRow / segments) / gridDivisions;
            const point = getSpherePoint(face, u, v, surfaceOffset);
            positions.push(point.x, point.y, point.z);
            uvs.push(gridColumn / segments, 1 - gridRow / segments);
        }
    }

    for (let gridRow = 0; gridRow < segments; gridRow++) {
        for (let gridColumn = 0; gridColumn < segments; gridColumn++) {
            const topLeft = gridRow * (segments + 1) + gridColumn;
            const topRight = topLeft + 1;
            const bottomLeft = topLeft + segments + 1;
            const bottomRight = bottomLeft + 1;
            indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function createCellRandom(cell, salt) {
    let seed = salt;
    for (const character of cell.key) {
        seed = (seed * 31 + character.charCodeAt(0)) % 2147483647;
    }
    return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
}

function createForestPatch(cell) {
    const random = createCellRandom(cell, 4729);
    const step = 2 / gridDivisions;
    const halfStep = step / 2;
    const centerU = -1 + 2 * (cell.column + 0.5) / gridDivisions;
    const centerV = 1 - 2 * (cell.row + 0.5) / gridDivisions;
    const coverage = 0.5 + random() * 0.4;
    const polygon = [];
    const segmentCount = 32;

    for (let segment = 0; segment < segmentCount; segment++) {
        const angle = segment / segmentCount * Math.PI * 2;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const squareRadius = halfStep / Math.max(Math.abs(cosine), Math.abs(sine));
        const irregularity = 0.82 + random() * 0.36;
        const radius = Math.min(
            squareRadius * Math.sqrt(coverage) * irregularity,
            squareRadius * 0.99
        );
        polygon.push({
            u: centerU + cosine * radius,
            v: centerV + sine * radius
        });
    }

    return { face: cell.face, centerU, centerV, halfStep, coverage, polygon };
}

function isPointInForestPatch(u, v, forestPatch) {
    let inside = false;
    const polygon = forestPatch.polygon;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
        const currentPoint = polygon[index];
        const previousPoint = polygon[previous];
        const crosses = (currentPoint.v > v) !== (previousPoint.v > v)
            && u < (previousPoint.u - currentPoint.u)
                * (v - currentPoint.v)
                / (previousPoint.v - currentPoint.v)
                + currentPoint.u;
        if (crosses) inside = !inside;
    }
    return inside;
}

function createForestGeometry(cell, forestPatch, surfaceOffset) {
    const positions = [];
    const uvs = [];
    const indices = [];
    const center = getSpherePoint(cell.face, forestPatch.centerU, forestPatch.centerV, surfaceOffset);
    positions.push(center.x, center.y, center.z);
    uvs.push(0.5, 0.5);

    for (const point of forestPatch.polygon) {
        const surfacePoint = getSpherePoint(cell.face, point.u, point.v, surfaceOffset);
        positions.push(surfacePoint.x, surfacePoint.y, surfacePoint.z);
        uvs.push(
            (point.u - forestPatch.centerU) / (forestPatch.halfStep * 2) + 0.5,
            (point.v - forestPatch.centerV) / (forestPatch.halfStep * 2) + 0.5
        );
    }

    for (let index = 0; index < forestPatch.polygon.length; index++) {
        const next = (index + 1) % forestPatch.polygon.length;
        indices.push(0, index + 1, next + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function createForestTrees(cell, forestPatch) {
    const random = createCellRandom(cell, 9187);
    const group = new THREE.Group();
    const treeCount = 16 + Math.floor(random() * 10);
    const bounds = forestPatch.polygon.reduce((result, point) => ({
        minU: Math.min(result.minU, point.u),
        maxU: Math.max(result.maxU, point.u),
        minV: Math.min(result.minV, point.v),
        maxV: Math.max(result.maxV, point.v)
    }), {
        minU: Infinity,
        maxU: -Infinity,
        minV: Infinity,
        maxV: -Infinity
    });
    const randomPoint = () => {
        for (let attempt = 0; attempt < 30; attempt++) {
            const point = {
                u: bounds.minU + random() * (bounds.maxU - bounds.minU),
                v: bounds.minV + random() * (bounds.maxV - bounds.minV)
            };
            if (isPointInForestPatch(point.u, point.v, forestPatch)) return point;
        }
        return { u: forestPatch.centerU, v: forestPatch.centerV };
    };
    const clusters = Array.from({ length: 3 }, randomPoint);
    const trunks = new THREE.InstancedMesh(treeTrunkGeometry, treeTrunkMaterial, treeCount);
    const foliage = [0, 1, 2].map(() =>
        new THREE.InstancedMesh(treeFoliageGeometry, treeFoliageMaterial, treeCount)
    );
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const orientation = new THREE.Quaternion();
    const localRotation = new THREE.Quaternion();
    const matrix = new THREE.Matrix4();
    const foliageColor = new THREE.Color();

    for (let index = 0; index < treeCount; index++) {
        const cluster = clusters[index % clusters.length];
        let point;
        for (let attempt = 0; attempt < 10; attempt++) {
            point = {
                u: cluster.u + (random() + random() - 1) * forestPatch.halfStep * 0.42,
                v: cluster.v + (random() + random() - 1) * forestPatch.halfStep * 0.42
            };
            if (isPointInForestPatch(point.u, point.v, forestPatch)) break;
            point = null;
        }
        point = point || randomPoint();

        const treeScale = 0.8 + random() * 0.55;
        const base = getSpherePoint(cell.face, point.u, point.v, 0.04);
        normal.copy(base).normalize();
        orientation.setFromUnitVectors(up, normal);
        localRotation.setFromAxisAngle(up, random() * Math.PI * 2);
        orientation.multiply(localRotation);

        position.copy(base).addScaledVector(normal, 0.05 * treeScale);
        scale.setScalar(treeScale);
        matrix.compose(position, orientation, scale);
        trunks.setMatrixAt(index, matrix);

        foliageColor.setHSL(0.25 + random() * 0.08, 0.38 + random() * 0.22, 0.29 + random() * 0.13);
        for (let layer = 0; layer < foliage.length; layer++) {
            position.copy(base).addScaledVector(normal, (0.085 + layer * 0.034) * treeScale);
            const layerScale = 1 - layer * 0.18;
            scale.set(treeScale * layerScale, treeScale * (0.9 - layer * 0.12), treeScale * layerScale);
            matrix.compose(position, orientation, scale);
            foliage[layer].setMatrixAt(index, matrix);
            foliage[layer].setColorAt(index, foliageColor);
        }
    }

    trunks.instanceMatrix.needsUpdate = true;
    group.add(trunks);
    for (const layer of foliage) {
        layer.instanceMatrix.needsUpdate = true;
        if (layer.instanceColor) layer.instanceColor.needsUpdate = true;
        group.add(layer);
    }
    return group;
}

function getCellEdge(cell, side) {
    const step = 2 / gridDivisions;
    const uMin = -1 + 2 * cell.column / gridDivisions;
    const uMax = uMin + step;
    const vMax = 1 - 2 * cell.row / gridDivisions;
    const vMin = vMax - step;
    const edges = {
        left: { start: { u: uMin, v: vMax }, end: { u: uMin, v: vMin }, inward: { u: 1, v: 0 } },
        right: { start: { u: uMax, v: vMax }, end: { u: uMax, v: vMin }, inward: { u: -1, v: 0 } },
        top: { start: { u: uMin, v: vMax }, end: { u: uMax, v: vMax }, inward: { u: 0, v: -1 } },
        bottom: { start: { u: uMin, v: vMin }, end: { u: uMax, v: vMin }, inward: { u: 0, v: 1 } }
    };
    return edges[side];
}

function getNeighborCell(cell, side) {
    const step = 2 / gridDivisions;
    const u = -1 + 2 * (cell.column + 0.5) / gridDivisions;
    const v = 1 - 2 * (cell.row + 0.5) / gridDivisions;
    const outsidePoint = {
        left: { u: u - step * 1.01, v },
        right: { u: u + step * 1.01, v },
        top: { u, v: v + step * 1.01 },
        bottom: { u, v: v - step * 1.01 }
    }[side];
    return getGridCell(getCubeFacePoint(cell.face, outsidePoint.u, outsidePoint.v).normalize());
}

function edgeEndpointsMatch(first, second) {
    const firstStart = getCubeFacePoint(first.face, first.edge.start.u, first.edge.start.v).normalize();
    const firstEnd = getCubeFacePoint(first.face, first.edge.end.u, first.edge.end.v).normalize();
    const secondStart = getCubeFacePoint(second.face, second.edge.start.u, second.edge.start.v).normalize();
    const secondEnd = getCubeFacePoint(second.face, second.edge.end.u, second.edge.end.v).normalize();
    const sameDirection = firstStart.distanceTo(secondStart) < 0.0001
        && firstEnd.distanceTo(secondEnd) < 0.0001;
    const reverseDirection = firstStart.distanceTo(secondEnd) < 0.0001
        && firstEnd.distanceTo(secondStart) < 0.0001;
    return { matches: sameDirection || reverseDirection, reverse: reverseDirection };
}

function createBeachGeometry(firstCell, firstSide, secondCell, secondSide) {
    const firstEdge = getCellEdge(firstCell, firstSide);
    const secondEdge = getCellEdge(secondCell, secondSide);
    const orientation = edgeEndpointsMatch(
        { face: firstCell.face, edge: firstEdge },
        { face: secondCell.face, edge: secondEdge }
    );
    if (!orientation.matches) return null;

    const segments = 24;
    const step = 2 / gridDivisions;
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    const sandColors = [
        new THREE.Color(0xc69d68),
        new THREE.Color(0x9e805b),
        new THREE.Color(0x927858),
        new THREE.Color(0xb99a6a)
    ];
    const phase = (firstCell.face * 7 + firstCell.row * 3 + firstCell.column) * 0.37;

    for (let segment = 0; segment <= segments; segment++) {
        const t = segment / segments;
        const edgeWave = 0.68 + 0.22 * Math.sin(t * 17 + phase) + 0.1 * Math.sin(t * 31 - phase);
        const taper = Math.pow(Math.sin(Math.PI * t), 0.35);
        const firstWidth = step * 0.2 * edgeWave * taper;
        const secondWidth = step * 0.17 * (0.72 + 0.28 * Math.sin(t * 13 - phase)) * taper;
        const secondT = orientation.reverse ? 1 - t : t;
        const points = [
            {
                cell: firstCell,
                edge: firstEdge,
                t,
                inward: firstWidth
            },
            {
                cell: firstCell,
                edge: firstEdge,
                t,
                inward: 0
            },
            {
                cell: secondCell,
                edge: secondEdge,
                t: secondT,
                inward: 0
            },
            {
                cell: secondCell,
                edge: secondEdge,
                t: secondT,
                inward: secondWidth
            }
        ];

        for (let band = 0; band < points.length; band++) {
            const point = points[band];
            const u = point.edge.start.u + (point.edge.end.u - point.edge.start.u) * point.t
                + point.edge.inward.u * point.inward;
            const v = point.edge.start.v + (point.edge.end.v - point.edge.start.v) * point.t
                + point.edge.inward.v * point.inward;
            const position = getSpherePoint(point.cell.face, u, v, 0.05);
            positions.push(position.x, position.y, position.z);
            colors.push(sandColors[band].r, sandColors[band].g, sandColors[band].b);
            uvs.push(t * 4, band / (points.length - 1));
        }
    }

    for (let segment = 0; segment < segments; segment++) {
        const row = segment * 4;
        for (let band = 0; band < 3; band++) {
            const first = row + band;
            const next = first + 4;
            indices.push(first, first + 1, next, first + 1, next + 1, next);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function connectBeachToNeighbors(tile, connectedPairs = null) {
    const sides = ['left', 'right', 'top', 'bottom'];
    for (const side of sides) {
        const neighborCell = getNeighborCell(tile.cell, side);
        const neighbor = tilesByCell.get(neighborCell.key);
        if (!neighbor
            || neighbor.type === tile.type
            || ![tile.type, neighbor.type].includes('grass')
            || ![tile.type, neighbor.type].includes('ocean')) continue;
        const pairKey = [tile.cell.key, neighbor.cell.key].sort().join('|');
        if (connectedPairs?.has(pairKey)) continue;
        connectedPairs?.add(pairKey);

        const neighborSide = sides.find((sideName) =>
            getNeighborCell(neighbor.cell, sideName).key === tile.cell.key
        );
        if (!neighborSide) continue;
        const geometry = createBeachGeometry(
            tile.cell,
            side,
            neighbor.cell,
            neighborSide
        );
        if (!geometry) continue;

        const beach = new THREE.Mesh(geometry, beachMaterial.clone());
        beach.position.copy(sphere.position);
        beach.userData.createdAt = performance.now();
        const grassTile = tile.type === 'grass' ? tile : neighbor;
        beach.userData.grassCellKey = grassTile.cell.key;
        scene.add(beach);
        beachStrips.push(beach);
    }
}

function rebuildPlanetSurface() {
    sphere.geometry.dispose();
    sphere.geometry = new THREE.SphereGeometry(planetRadius, 32, 32);
    for (const tile of placedTiles) {
        tile.mesh.geometry.dispose();
        tile.mesh.geometry = tile.type === 'forest'
            ? createForestGeometry(tile.cell, tile.mesh.userData.forestPatch, 0.035)
            : createTileGeometry(tile.cell.face, tile.cell.row, tile.cell.column, 0.022);
        tile.mesh.position.copy(sphere.position);
        if (tile.detailMesh) {
            if (tile.type === 'forest') {
                scene.remove(tile.detailMesh);
                tile.detailMesh = createForestTrees(tile.cell, tile.mesh.userData.forestPatch);
                scene.add(tile.detailMesh);
            } else {
                tile.detailMesh.geometry.dispose();
                tile.detailMesh.geometry = createTileGeometry(
                    tile.cell.face,
                    tile.cell.row,
                    tile.cell.column,
                    0.03
                );
            }
            tile.detailMesh.position.copy(sphere.position);
        }
    }

    for (const beach of beachStrips) {
        scene.remove(beach);
        beach.geometry.dispose();
        beach.material.dispose();
    }
    beachStrips.length = 0;
    const connectedPairs = new Set();
    for (const tile of placedTiles) {
        connectBeachToNeighbors(tile, connectedPairs);
    }

    planetGrid.geometry.dispose();
    planetGrid.geometry = createPlanetGridGeometry();
    planetGrid.position.copy(sphere.position);
    previewTile.geometry.dispose();
    const cell = previewTile.userData.cell;
    previewTile.geometry = createTileGeometry(
        cell?.face ?? 0,
        cell?.row ?? 0,
        cell?.column ?? 0,
        0.035
    );
    previewTile.position.copy(sphere.position);

    for (const human of humans) {
        const surfacePoint = human.direction.clone().multiplyScalar(planetRadius + 0.035);
        human.group.position.copy(sphere.position).add(surfacePoint);
    }
}

function updateTileAnimations(timeSeconds, now) {
    if (now - grassMaterial.map.userData.lastUpdated >= 70) {
        drawGrassTexture(grassMaterial.map, timeSeconds);
        grassMaterial.map.userData.lastUpdated = now;
    }
    oceanDetailTexture.offset.x = (timeSeconds * 0.035) % 1;
    oceanDetailTexture.offset.y = 0.025 * Math.sin(timeSeconds * 1.4);

    for (const beach of beachStrips) {
        beach.material.opacity = Math.min(0.92, ((now - beach.userData.createdAt) / 1800) * 0.92);
    }
}

function createPlanetGridGeometry() {
    const positions = [];
    const lineSegmentsPerCell = 4;

    for (let face = 0; face < 6; face++) {
        for (let line = 0; line <= gridDivisions; line++) {
            const u = -1 + 2 * line / gridDivisions;
            const v = 1 - 2 * line / gridDivisions;
            for (let cell = 0; cell < gridDivisions; cell++) {
                for (let segment = 0; segment < lineSegmentsPerCell; segment++) {
                    const startU = -1 + 2 * (cell + segment / lineSegmentsPerCell) / gridDivisions;
                    const endU = -1 + 2 * (cell + (segment + 1) / lineSegmentsPerCell) / gridDivisions;
                    const startV = 1 - 2 * (cell + segment / lineSegmentsPerCell) / gridDivisions;
                    const endV = 1 - 2 * (cell + (segment + 1) / lineSegmentsPerCell) / gridDivisions;
                    const points = [
                        getSpherePoint(face, startU, v, 0.018),
                        getSpherePoint(face, endU, v, 0.018),
                        getSpherePoint(face, u, startV, 0.018),
                        getSpherePoint(face, u, endV, 0.018)
                    ];
                    for (const point of points) {
                        positions.push(point.x, point.y, point.z);
                    }
                }
            }
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
}

const planetGrid = new THREE.LineSegments(
    createPlanetGridGeometry(),
    new THREE.LineBasicMaterial({
        color: 0x83ff93,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        depthTest: true
    })
);
planetGrid.position.copy(sphere.position);
planetGrid.visible = false;
scene.add(planetGrid);

const previewTile = new THREE.Mesh(createTileGeometry(0, 0, 0, 0.035), previewMaterial);
previewTile.position.copy(sphere.position);
previewTile.visible = false;
previewTile.userData.valid = false;
previewTile.userData.cell = null;
scene.add(previewTile);

const { group: humanPreview } = createHumanVisual(true);
humanPreview.visible = false;
humanPreview.userData.valid = false;
humanPreview.userData.habitatCellKey = null;
scene.add(humanPreview);

function updateTilePreview() {
    if (placementType === 'human') {
        updateHumanPreview();
        return;
    }
    if (!placementArmed) {
        previewTile.visible = false;
        return;
    }

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(sphere)[0];
    if (!hit) {
        previewTile.visible = false;
        return;
    }

    const direction = hit.point.clone().sub(sphere.position).normalize();
    const cell = getGridCell(direction);
    if (!previewTile.userData.cell
        || previewTile.userData.cell.key !== cell.key
        || previewTile.userData.type !== placementType) {
        previewTile.geometry.dispose();
        previewTile.userData.forestPatch = placementType === 'forest'
            ? createForestPatch(cell)
            : null;
        previewTile.geometry = placementType === 'forest'
            ? createForestGeometry(cell, previewTile.userData.forestPatch, 0.035)
            : createTileGeometry(cell.face, cell.row, cell.column, 0.035);
        previewTile.userData.cell = cell;
        previewTile.userData.type = placementType;
    }

    const isOccupied = occupiedCells.has(cell.key);
    previewTile.userData.valid = !isOccupied;
    previewMaterial.color.set(
        isOccupied ? 0xff3030 : placementType === 'grass'
            ? 0x39ff45
            : placementType === 'ocean'
                ? 0x32c9ed
                : 0x7eaa52
    );
    previewTile.visible = true;
}

function updateIncomeDisplay() {
    const baseIncomePerSecond = getBaseIncomePerSecond();
    const upgradeMultiplier = getPlanetUpgradeMultiplier();
    const grassTileIncome = grassTileCount * upgradeMultiplier;
    const oceanTileIncome = oceanTileCount * 10 * upgradeMultiplier;
    const incomePerSecond = getTotalIncomePerSecond(baseIncomePerSecond);
    const totalHumanIncome = incomePerSecond - baseIncomePerSecond;
    const totalTileCount = grassTileCount + oceanTileCount + forestTileCount;

    totalTileCountDisplay.textContent = String(totalTileCount);
    grassSummaryCountDisplay.textContent = `Grass · ${grassTileCount} ${grassTileCount === 1 ? 'tile' : 'tiles'}`;
    oceanSummaryCountDisplay.textContent = `Ocean · ${oceanTileCount} ${oceanTileCount === 1 ? 'tile' : 'tiles'}`;
    forestSummaryCountDisplay.textContent = `Forest · ${forestTileCount} ${forestTileCount === 1 ? 'tile' : 'tiles'}`;
    grassTileIncomeDisplay.textContent = `+$${grassTileIncome.toFixed(2)}/sec`;
    oceanTileIncomeDisplay.textContent = `+$${oceanTileIncome.toFixed(2)}/sec`;
    forestTileIncomeDisplay.textContent = '+$0.00/sec';
    humanSummaryCountDisplay.textContent = `Humans · ${humanCount}`;
    humanTileIncomeDisplay.textContent = `+$${totalHumanIncome.toFixed(2)}/sec`;
    grassTileCountDisplay.textContent = `${grassTileCount} ${grassTileCount === 1 ? 'tile' : 'tiles'} placed`;
    oceanTileCountDisplay.textContent = `${oceanTileCount} ${oceanTileCount === 1 ? 'tile' : 'tiles'} placed`;
    forestTileCountDisplay.textContent = `${forestTileCount} ${forestTileCount === 1 ? 'tile' : 'tiles'} placed`;
    humanCountDisplay.textContent = `${humanCount} placed · ${(grassTileCount + forestTileCount) * 3} total habitat spots`;
    moneyRateDisplay.textContent = `+$${incomePerSecond.toFixed(2)}/sec`;
}

function updateMoneyDisplay() {
    moneyDisplay.textContent = `$${money.toFixed(2)}`;
    const grassTileCost = getTileCost('grass');
    const oceanTileCost = getTileCost('ocean');
    const forestTileCost = getTileCost('forest');
    buyGrassButton.textContent = `Buy · $${grassTileCost.toFixed(2)}`;
    buyGrassButton.disabled = money < grassTileCost;
    buyOceanButton.textContent = `Buy · $${oceanTileCost.toFixed(2)}`;
    buyOceanButton.disabled = money < oceanTileCost;
    buyForestButton.textContent = `Buy · $${forestTileCost.toFixed(2)}`;
    buyForestButton.disabled = money < forestTileCost;
    const humanCost = getHumanCost();
    buyHumanButton.textContent = `Buy · $${humanCost.toFixed(2)}`;
    buyHumanButton.disabled = money < humanCost;
    const planetUpgradeCost = getPlanetUpgradeCost();
    planetUpgradeCostDisplay.textContent = `$${planetUpgradeCost.toFixed(2)}`;
    planetUpgradeButton.disabled = money < planetUpgradeCost;
    planetUpgradeButton.title = `Increase planet size by 1 · $${planetUpgradeCost.toFixed(2)}`;
    planetUpgradeButton.setAttribute(
        'aria-label',
        `Upgrade planet by 1 size for $${planetUpgradeCost.toFixed(2)}`
    );
    updateIncomeDisplay();
}

function getBaseIncomePerSecond() {
    return (planetSize + grassTileCount + oceanTileCount * 10)
        * getPlanetUpgradeMultiplier();
}

function getTotalIncomePerSecond() {
    return getBaseIncomePerSecond();
}

function getHumanCost() {
    return baseHumanCost * humanCostMultiplier ** humanCount;
}

function getTileCost(type) {
    if (type === 'grass') {
        return baseGrassTileCost * grassTileCostMultiplier ** grassTileCount;
    }
    if (type === 'forest') {
        return baseForestTileCost * forestTileCostMultiplier ** forestTileCount;
    }
    return baseOceanTileCost * oceanTileCostMultiplier ** oceanTileCount;
}

function getPlanetUpgradeMultiplier() {
    return 1.05 ** planetUpgradeCount;
}

function getPlanetUpgradeCost() {
    return basePlanetUpgradeCost * 5 ** planetUpgradeCount;
}

function purchasePlanetUpgrade() {
    const cost = getPlanetUpgradeCost();
    if (money < cost) return;

    const cameraDistance = camera.position.distanceTo(sphere.position);
    money -= cost;
    planetUpgradeCount += 1;
    planetSize += 1;
    planetRadius += planetScale;
    collisionRadius = planetRadius + cameraRadius;
    planetSizeDisplay.textContent = `Size: ${planetSize}`;
    rebuildPlanetSurface();

    const viewDirection = camera.position.clone().sub(sphere.position).normalize();
    camera.position.copy(sphere.position).addScaledVector(viewDirection, cameraDistance + planetScale);
    camera.far = planetRadius + 1000;
    camera.updateProjectionMatrix();
    sunlight.position.set(-planetRadius * 2, planetRadius * 1.5, planetRadius * 3);
    updateHumanDetails();
    updateMoneyDisplay();
    shopStatus.textContent = `Planet upgraded to size ${planetSize}! All income effects increased by 5%.`;
}

updateMoneyDisplay();

// Resize renderer on window changes
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop to keep the scene running
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const elapsedTime = previousFrameTime === 0 ? 0 : (now - previousFrameTime) / 1000;
    const deltaTime = Math.min(elapsedTime, 0.1);
    previousFrameTime = now;
    money += getTotalIncomePerSecond() * elapsedTime;
    updateMoneyDisplay();
    updateTileAnimations(now / 1000, now);
    updateHumans(deltaTime, now / 1000, elapsedTime);
    updateCamera(deltaTime);
    for (const planet of distantPlanets) {
        planet.group.position.copy(camera.position).addScaledVector(planet.direction, planet.distance);
        planet.group.children[0].rotation.y += planet.rotationSpeed * elapsedTime;
    }
    sky.position.copy(camera.position);
    starField.position.copy(camera.position);
    brightStarField.position.copy(camera.position);
    renderer.render(scene, camera);
}
animate();
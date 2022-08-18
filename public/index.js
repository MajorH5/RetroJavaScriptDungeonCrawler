const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

class Player extends Entity {
  constructor(x, y) {
    const sprite = new Sprite('assets/images/player.png', 96, 64);
    
    super(x, y, sprite);

    this.gold = 100;
    this.hotBarItems = [null, null, null, null];
    this.lastCollectAttempt = -Infinity;
    this.lastAccessoryEffect = -Infinity;
    this.lastAttack = -Infinity
    this.backpack = [];
    this.maxItems = 8;
    this.strength = 0;
  }

  get weapon () { return this.hotBarItems[0]; }
  get special () { return this.hotBarItems[1]; }
  get armor () { return this.hotBarItems[2]; }
  get accessory () { return this.hotBarItems[3]; }

  getWeaponCooldown () {
    const weapon = this.weapon;
    return weapon ? Items.Cooldowns[weapon.name] : 1 / 2;
  }

  getWeaponDamage () {
    const weapon = this.weapon;
    const damage = weapon ? weapon.use() : Math.floor(Math.random() * (3 - 1) + 1);
    
    return damage + this.strength;
  }

  cooldownPercentage () {
    const timeNow = new Date();
    let elapsed = (timeNow - this.lastAttack) / 1000;
    const cooldown = this.getWeaponCooldown();

    if (elapsed > cooldown) {
      elapsed = cooldown;
    }

    return elapsed / cooldown;
  }
  
  attack (entity) {
    const timeNow = new Date();
    const weaponCooldown = this.getWeaponCooldown();
    const cannotPerformAttack = (timeNow - this.lastAttack) / 1000 < weaponCooldown;

    if (cannotPerformAttack) {
      return;
    }

    const damage = this.getWeaponDamage();

    entity.damage(damage);
    this.hitCell(entity.floorX, entity.floorY, weaponCooldown / 2);

    this.lastAttack = timeNow;
  }

  removeInventoryItem (item) {
    const index = this.backpack.indexOf(item);
    this.backpack.splice(index, 1);
  }

  removeHotbarItem (item) {
    const index = this.hotBarItems.indexOf(item);
    if (index !== -1) {
      this.hotBarItems[index] = null;
    }
  }
  
  collect (item) {
    this.lastCollectAttempt = new Date();
    if (this.backpack.length === this.maxItems){
      return false;
    }
    
    const index = globalWorldItems.indexOf(item);
    globalWorldItems.splice(index, 1);
    
    item.sprite.visible = false;
    this.backpack.push(item);
    return true;
  }

  damage (amount) {
    const defense = this.armor ? this.armor.use() : 0;
    amount -= defense;

    if (amount < 0) {
      amount = 0
    }

    const wasBlocked = this.special ? this.special.use() : false;

    if (wasBlocked) {
      playSound('assets/sounds/snd_bump.wav');
      return;
    }
    
    super.damage(amount);
  }
  
  performAccessory (time) {
    const accessoryCooldown = this.accessory ? Items.Cooldowns[this.accessory.name] : Infinity;
    
    if ((time - this.lastAccessoryEffect) / 1000 > accessoryCooldown) {
      const healthGained = this.accessory.use();

      if (player.health < 100) {
        this.health += healthGained;
        if (this.health > 100) {
          this.health = 100;
        }
      }
      
      this.lastAccessoryEffect = time;
    }
  }

  update (context, width, scroll) {
    super.update(context, width, scroll);
    this.performAccessory(new Date());

    const cooldown = this.cooldownPercentage();
    const shouldDrawCooldown = cooldown !== 1;
    
    if (shouldDrawCooldown){
      const cooldownWidth = defaultTileSize;
      const cooldownHeight = 10;
      
      this.hpBarOffset = 25
      
      const [screenX, screenY] = convertToScreenCoordinates(this.x, this.y);
  
      context.strokeStyle = Colors.WHITE;
      context.fillStyle = Colors.BLACK;
  
      const cooldownBarPositionX = screenX + defaultTileSize / 2 - cooldownWidth / 2;
      const cooldownBarPositionY = screenY - cooldownHeight - 10;
      
      context.beginPath();
      context.rect(cooldownBarPositionX, cooldownBarPositionY, cooldownWidth, cooldownHeight);
      context.fill();
      context.stroke();
  
      context.fillStyle = Colors.WHITE;
  
      let cooldownBarWidth = (cooldownWidth * cooldown) - 1;
  
      if (cooldownBarWidth < 0) {
        cooldownBarWidth = 0;
      }
      
      context.fillRect(cooldownBarPositionX + 1, cooldownBarPositionY + 1, cooldownBarWidth, cooldownHeight - 1);
    } else {
      this.hpBarOffset = 5;
    }
  }
  
  moveTo (...args) {
    this.lastCollectAttempt = -Infinity;
    playSound('assets/sounds/snd_step.wav');
    return super.moveTo(...args);
  }
}

class Skeleton extends Entity {
  constructor (x, y) {
    const sprite = new Sprite('assets/images/skeleton.png');
    super(x, y, sprite);
    this.setMaxHealth(10);
    this.targettingTile = null;
  }

  async behave () {
    if (Math.random() < 0.03 && !this.targettingTile) {
      this.targettingTile = true;
      
      const randomXTile = player.floorX;
      const randomYTile = player.floorY;
      
      const path = performPathfinding(this.x, this.y, randomXTile, randomYTile);

      if (path.length === 0) { // nasty hack...
        path.push({ x: this.x, y: this.y });
      }
      
      for (const point of path) {
        await this.moveTo(point.x, point.y, true);

        while (player.isAlive && this.isAlive && isNeighboringCell(this.x, this.y, player.floorX, player.floorY)) {
          await this.hitCell(player.floorX, player.floorY, 0.1);
          player.damage(8);
          await this.pause(1);
        }
        
      }
      
      this.targettingTile = false;
    } 
  }
  
  update (...args) {
    this.behave();
    super.update(...args);
  }
}

const Tiles = {
  EMPTY: 0, EMPTY_DIRT_1: 1, EMPTY_DIRT_2: 2,
  BRICK: 3, STAIRCASE_DOWN: 4, LOCKED_CHEST: 5,
  PLAYER: 6
};
const Colors = {
  BLACK: '#000000', WHITE: '#FFFFFF',
  RED: '#FF0000'
};
const Settings = { freeScrollEnabled: false };

const solidTiles = [Tiles.BRICK, Tiles.LOCKED_CHEST];
const interactableTiles = [Tiles.LOCKED_CHEST, Tiles.STAIRCASE_DOWN];

const canvasSizeWidth = 800;
const canvasSizeHeight = 700;
const canvasFontSize = 50;

const canvasCenterX = Math.floor(canvasSizeWidth / 2);
const canvasCenterY = Math.floor(canvasSizeHeight / 2);

const defaultWorldSize = 32;
const defaultWorldScale = 3;
const defaultTileSize = 32 * defaultWorldScale;

const tileSetImage = ((url) => {
  const image = new Image(96, 64);
  image.src = url;
  return image;
})('assets/images/tileset.png');
const tileSetSize = 16;
const tileSetWidth = 6;
const tileSetHeight = 4;

let worldScrollTween = null;
const worldScroll = { x: 0, y: 0 };

const keys = {};
const mouse = { x: 0, y: 0, down: false, processing: false };

const gameTickSpeed = 1 / 30;
const playerMoveRate = 1 / 60;

let dungeonDepth = 0
let isDescending = false;
let lastDescent = -Infinity;

let backpackIsOpen = false;
let canOpenBackpack = true;
let isHoldingCell = false;

let gameIsRunning = true;

const globalWorldEntities = [];
let globalWorldItems = [];

let openedSpriteInfo = null;
let justPerformedInteraction = false;

const player = new Player(1, 1);

let worldMapTileSet = [[]];
let worldMapLoaded = false;

canvas.width = canvasSizeWidth;
canvas.height = canvasSizeHeight;

canvas.style.width = canvasSizeWidth + 'px';
canvas.style.height = canvasSizeHeight + 'px';

context.imageSmoothingEnabled = false;
context.font = canvasFontSize + 'px pixel-font';

function convertToScreenCoordinates(x, y) {
  const realScreenPositionX = x * defaultTileSize + worldScroll.x;
  const realScreenPositionY = y * defaultTileSize + worldScroll.y;

  return [realScreenPositionX, realScreenPositionY];
}

function getTileImageOffsets(tile) {
  const xPos = (tile % tileSetWidth) * tileSetSize;
  const yPos = Math.floor(tile / tileSetWidth) * tileSetSize;

  return [xPos, yPos];
}

function playSound (assetURL) {
  const sound = new Audio(assetURL);
  sound.play();
  return sound;
}

function isOffScreen(x, y) {
  if (x <= -defaultTileSize || x >= canvasSizeWidth) {
    return true;
  }
  if (y <= -defaultTileSize || y >= canvasSizeHeight) {
    return true;
  }
  return false;
}

function isNeighboringCell (x, y, checkX, checkY) {
  const neighborCell = getNeighboringTiles(x, y).filter(cell => {
    return cell.x === checkX && cell.y == checkY;
  });
  return neighborCell.length === 1;
}

function getItemsAtTile (x, y) {
  return globalWorldItems.filter(item => {
    return Math.floor(item.x) === x && Math.floor(item.y) === y;
  });
}

function getEntityAtTile (x, y) {
  return globalWorldEntities.find(entity => {
    return entity.floorX === x && entity.floorY === y;
  });
}

function areItemsInTile (x, y){
  return getItemsAtTile(x, y).length > 0;
}

function drawGlobalTiles(context, tileSet) {
  for (let y = 0; y < tileSet.length; y++) {
    const tileSetRow = tileSet[y];
    for (let x = 0; x < tileSetRow.length; x++) {
      const [screenX, screenY] = convertToScreenCoordinates(x, y);

      if (isOffScreen(screenX, screenY)) {
        continue;
      }

      const tile = tileSetRow[x];
      const [offsetX, offsetY] = getTileImageOffsets(tile);

      context.drawImage(
        tileSetImage, offsetX, offsetY,
        tileSetSize, tileSetSize,
        screenX, screenY,
        defaultTileSize, defaultTileSize
      );
    }
  }
}

function drawOnScreenUI(context) {
  const elapsedSinceDescend = (new Date() - lastDescent) / 1000;
  if (elapsedSinceDescend > 0.5 && elapsedSinceDescend < 3) {
    console.log('goin down')
    context.font = '60px pixel-font';
    context.textAlign = 'center';
    context.fillStyle = Colors.WHITE;
    context.strokeStyle = Colors.BLACK;

    context.lineWidth = 5;
    context.strokeText('Depth: ' + dungeonDepth, canvasCenterX, canvasCenterY);
    context.fillText('Depth: ' + dungeonDepth, canvasCenterX, canvasCenterY);
  }

  
  const itemSize = defaultTileSize / 1.5;
  const hotBarWidth = itemSize * 4;
  const hotBarHeight = itemSize;

  const totalItems = player.hotBarItems.length
  const cellSize = Math.floor(hotBarWidth / totalItems);

  const hotBarX = Math.floor(canvasCenterX - hotBarWidth / 2);
  const hotBarY = canvasSizeHeight - hotBarHeight - 50;

  context.strokeStyle = Colors.WHITE;
  context.fillStyle = Colors.BLACK;
  
  context.lineWidth = 3;
  context.beginPath();
  context.rect(hotBarX, hotBarY, hotBarWidth, hotBarHeight);
  context.fill();
  context.stroke();

  for (let i = 0; i < totalItems; i++) {
    const item = player.hotBarItems[i];
    const cellXPosition = hotBarX + i * cellSize;

    context.beginPath();
    context.fillStyle = Colors.BLACK;
    context.rect(cellXPosition, hotBarY, cellSize, hotBarHeight);
    context.stroke();

    if (item) {
      const state = item.sprite.visible;
      item.sprite.visible = true;
      item.sprite.update(cellXPosition, hotBarY, itemSize, context);
      item.sprite.visible = state;
    } else {
      context.fillStyle = Colors.WHITE;
      context.font = '30px pixel-font';
      context.textAlign = 'center';
      context.fillText('-', cellXPosition + cellSize / 2, hotBarY + hotBarHeight / 2 + 4);
    }

  }

  const hpBarWidth = canvasSizeWidth - defaultTileSize * 4;
  const hpBarHeight = 10;

  const hpBarX = Math.floor(canvasCenterX - hpBarWidth / 2);
  const hpBarY = hotBarY - hpBarHeight - 40;

  context.strokeStyle = Colors.WHITE;
  context.fillStyle = Colors.BLACK;

  context.beginPath();
  context.rect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
  context.fill();
  context.stroke();

  const hpLevelWidth = (hpBarWidth * (player.health / 100)) - 3;
  
  context.fillStyle = Colors.WHITE;
  context.fillRect(hpBarX + 1.5, hpBarY + 1.5, hpLevelWidth < 0 ? 0 : hpLevelWidth, hpBarHeight - 3);
  
  if (backpackIsOpen) {
    const backpackCellSize = defaultTileSize;
    const backpackWidth = backpackCellSize * 4;
    const backpackHeight = backpackCellSize * 2;
    
    context.fillStyle = Colors.BLACK;
  
    const backpackPositionX = canvasCenterX - backpackWidth / 2;
    const backpackPositionY = canvasCenterY - backpackHeight / 2 - 50;
    
    context.beginPath();
    context.rect(backpackPositionX, backpackPositionY, backpackWidth, backpackHeight);
    context.fill();
    context.stroke();
  
    let mouseHoveredCell = false;
    
    for (let i = 0; i < player.backpack.length; i++){
      (async function () {
        let cellXPosition = (i * backpackCellSize) % backpackWidth;
        let cellYPosition = Math.floor((i * backpackCellSize) / backpackWidth) * backpackCellSize;
    
        cellXPosition += backpackPositionX;
        cellYPosition += backpackPositionY;
        
        const item = player.backpack[i];
        const sprite = item.sprite;
        const index = item.index;
        const description = Descriptions.Items[index];
    
        const mouseIsInCell = pointInsideRectangle(mouse.x, mouse.y, cellXPosition, cellYPosition, defaultTileSize, defaultTileSize);
        const leftMouseDown = mouse.down === 'left';
        const rightMouseDown = mouse.down === 'right';
        
        if (mouseIsInCell) {
          mouseHoveredCell = true;
          context.globalAlpha = 0.3;
          context.fillStyle = Colors.WHITE;
          context.fillRect(cellXPosition, cellYPosition, defaultTileSize, defaultTileSize);
          context.globalAlpha = 1
          setMouseCursor('pointer');
  
          const useItem = () => {
            const hotBarIndex = item.hotbarCell;
  
            if (hotBarIndex !== null) { // equippable
              const currentItem = player.hotBarItems[hotBarIndex];
              if (currentItem && currentItem.name !== item.name) {
                const wasCollected = player.collect(currentItem);
                if (wasCollected) {
                  player.removeHotbarItem(currentItem);
                  player.removeInventoryItem(item);
                  player.hotBarItems[hotBarIndex] = item;
                  playSound('assets/sounds/snd_equip.wav');
                }
              } else if (!currentItem) {
                player.removeInventoryItem(item);
                player.hotBarItems[hotBarIndex] = item;
                playSound('assets/sounds/snd_equip.wav');
              }
            } else { // usable
              const wasUsed = item.use(player);
  
              if (wasUsed) {
                player.removeInventoryItem(item);
                playSound('assets/sounds/snd_use.wav');
              }
            }
  
            onInteractionPerformed()
            backpackIsOpen = false;
          };

          const dropItem = () => {
            const [dropCell] = getNeighboringTiles(player.floorX, player.floorY).filter(tile => {
              return isPassableCell(tile.x, tile.y);
            });

            if (!dropCell) {
              dropCell = { x: player.floorX, y: player.floorY };
            }

            item.x = player.floorX;
            item.y = player.floorY;
            
            player.removeInventoryItem(item);
            globalWorldItems.push(item);

            item.dropTo(dropCell.x, dropCell.y);

            onInteractionPerformed();
            backpackIsOpen = false;
          };
          
          if (leftMouseDown && !isHoldingCell) {
            isHoldingCell = true;

            let secondsToDrop = 0.5;
            let start = new Date();
            let elapsed = 0;
  
            while (mouse.down === 'left') {
              elapsed = (new Date() - start) / 1000;

              if (elapsed >= secondsToDrop) {
                dropItem();
                break;
              }
              
              await new Promise((resolve) => setTimeout(resolve, 1));
            }

            if (elapsed < secondsToDrop){
              useItem();
            }

            isHoldingCell = false;
          } else if (rightMouseDown) {
            openedSpriteInfo = { sprite, description };
          }
        } else if (!mouseHoveredCell) {
          setMouseCursor('default');
        }
    
        sprite.visible = true;
        sprite.update(
          cellXPosition, cellYPosition,
          defaultTileSize, context
        );
      })();
    }
  } else {
    player.backpack.forEach(item => {
      item.sprite.visible = false;
    });
  }

    if (openedSpriteInfo) {
    const infoWindowWidth = defaultTileSize * 4;
    const infoWindowHeight = defaultTileSize * 2;

    context.fillStyle = Colors.BLACK;

    const infoWindowPositionX = canvasCenterX - infoWindowWidth / 2;
    const infoWindowPositionY = canvasCenterY - infoWindowHeight / 2;

    context.beginPath();
    context.rect(infoWindowPositionX, infoWindowPositionY, infoWindowWidth, infoWindowHeight);
    context.fill();
    context.stroke()

    const { sprite, description } = openedSpriteInfo;
    const state = sprite.visible;

    sprite.visible = true;
    sprite.update(
      infoWindowPositionX + infoWindowWidth / 2 - defaultTileSize / 2,
      infoWindowPositionY, defaultTileSize, context
    );
    sprite.visible = state;

    const fontSize = 35;
    
    context.font = fontSize + 'px pixel-font';
    context.textAlign = 'start';
    context.fillStyle = Colors.WHITE;

    const lines = description.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const offset = i * fontSize;

      context.fillText(line, infoWindowPositionX + 16, infoWindowPositionY + defaultTileSize + 32 + offset);
    }
    
  }
}

function isPassableCell (x, y) {
  const hasNoOtherEntities = !getEntityAtTile(x, y);
  const isNotSolid = !isSolidTile(x, y);
  const isNotInteractable = !isInteractableTile(x, y);
  const isWithinBounds = isInBounds(x, y);

  if (hasNoOtherEntities && isNotSolid && isNotInteractable && isWithinBounds) {
    return true;
  }

  return false;
}

function pointInsideRectangle (pointX, pointY, rectX, rectY, rectW, rectH) {
  return pointX > rectX &&
    pointX < rectX + rectW &&
    pointY > rectY &&
    pointY < rectY + rectH;
}

function onBeforeGameRender(context) {
  context.translate(-0.5, -0.5);
  context.clearRect(0, 0, canvasSizeWidth, canvasSizeHeight);
  context.fillStyle = Colors.BLACK
  context.fillRect(0, 0, canvasSizeWidth, canvasSizeHeight);
}

function onAfterGameRender(context) {
  context.translate(0.5, 0.5);
}

function setMouseCursor (cursor) {
  canvas.style.cursor = cursor;
}

async function handleWorldScrolling (keysHeld) {
  const scrollAmmount = Settings.freeScrollEnabled ? 1 : defaultTileSize / 4;
  const space = ' ';
  
  if (keysHeld.ArrowUp) { worldScroll.y += scrollAmmount; };
  if (keysHeld.ArrowLeft) { worldScroll.x += scrollAmmount; };
  if (keysHeld.ArrowDown) { worldScroll.y += -scrollAmmount; };
  if (keysHeld.ArrowRight) { worldScroll.x += -scrollAmmount; };
  if (keysHeld[space] && canOpenBackpack) {
    canOpenBackpack = false;
    if (openedSpriteInfo) {
      openedSpriteInfo = null;
      backpackIsOpen = false;
    } else {
      backpackIsOpen = !backpackIsOpen;
    }
    while (keysHeld[space]) {
      await new Promise((resolve) => setTimeout(resolve), 1);
    }
    canOpenBackpack = true
  }
  if (keysHeld.f) {
    if (!worldScrollTween || !worldScrollTween.active) {
      tweenCameraToPoint(player.x, player.y);
    };
  };
}

function isInBounds (x, y) {
  if (worldMapLoaded) {
    return x >= 0 &&
      y >= 0 &&
      x < defaultWorldSize &&
      y < defaultWorldSize;
  } else {
    return false;
  }
}

function tweenCameraToPoint (x, y) {
  const scrollX = canvasCenterX - (x * defaultTileSize) - defaultTileSize / 2;
  const scrollY = canvasCenterY - (y * defaultTileSize) - defaultTileSize / 2;
  
  tweenGlobalScroll(scrollX, scrollY);
}

function handleKeyboardInput(keysHeld) {
  const timeNow = new Date();
  const cantPerformMovement = (timeNow - player.lastMovement) / 1000 < playerMoveRate;
  const isCurrentlyMoving = player.isMoving;

  if (cantPerformMovement || isCurrentlyMoving) {
    return;
  }
  
  openedSpriteInfo = null;

  let playerX = player.floorX;
  let playerY = player.floorY;

  if (keysHeld.w) { playerY += -1; }
  if (keysHeld.a) { playerX += -1; }
  if (keysHeld.s) { playerY += 1; }
  if (keysHeld.d) { playerX += 1; }

  const isOutOfBounds = !isInBounds(playerX, playerY);

  if (isOutOfBounds) {
    return;
  }
  
  const isNotPassableX = !isPassableCell(playerX, player.floorY);
  const isNotPassableY = !isPassableCell(player.floorX, playerY);

  const isNotPassable = !isPassableCell(playerX, playerY);

  const didNotMove = playerX === player.floorX && playerY === player.floorY;
  const isInteractable = isInteractableTile(playerX, playerY);

  if (didNotMove) {
    return;
  }

  if (isInteractable) {
    handleCellInteraction(playerX, playerY);
    return;
  }
  
  if (isNotPassableX) {
    playerX = player.floorX;
  }
  if (isNotPassableY) {
    playerY = player.floorY;
  }
  if (isNotPassable) {
    return;
  }

  tweenCameraToPoint(playerX, playerY);
  player.moveTo(playerX, playerY, true);
}

function getTileNameByValue (tile) {
  const keys = Object.keys(Tiles);
  const values = Object.values(Tiles);
  const index = values.indexOf(tile);
  const name = keys[index];

  return name;
}

function getTileForSpace (depth) {
  const random = Math.random();
  let tile;

  if (random < 0.015 / depth) {
    tile = Tiles.LOCKED_CHEST;
  } else if (random < .1) {
    tile = Tiles.EMPTY_DIRT_1;
  } else if (random < .2) {
    tile = Tiles.EMPTY_DIRT_2;
  } else {
    tile = Tiles.EMPTY;
  }

  return tile;
}

function generateNewRooms (depth) {
  const worldTiles = [];
  const holeCreated = {};
  
  for (let i = 0; i < defaultWorldSize; i++) {
    const worldTilesRow = [];
    for (let j = 0; j < defaultWorldSize; j++) {
      const holeWasCreated = holeCreated[j] !== undefined;
      
      if (i === 0 || i === defaultWorldSize - 1 || j === 0 || j === defaultWorldSize - 1) {
        worldTilesRow[j] = Tiles.BRICK;
        continue;
      }

      if (i === defaultWorldSize - 2 && j === defaultWorldSize - 2) {
        worldTilesRow[j] = Tiles.STAIRCASE_DOWN;
        continue;
      }

      if (j % 5 === 0) {
        if ((Math.random() < .1 && !holeWasCreated) || (i === defaultWorldSize - 2 && !holeWasCreated)) {
          worldTilesRow[j] = getTileForSpace(depth);
          holeCreated[j] = true;
        } else {
          worldTilesRow[j] = Tiles.BRICK;
        }
        continue;
      }

      worldTilesRow[j] = getTileForSpace(depth);
    }
    worldTiles[i] = worldTilesRow;
  }
  return worldTiles;
}

async function descend () {
  if (isDescending) {
    return;
  }

  isDescending = true;
  lastDescent = new Date();
  
  dungeonDepth++;
  playSound('assets/sounds/snd_switch.wav');
  
  if (context.globalAlpha !== 0) {
    await new Tween(0.2, [1, 0]).begin(alpha => {
      context.globalAlpha = alpha;
    });
  }

  worldMapTileSet = generateNewRooms(dungeonDepth);
  globalWorldEntities.forEach(entity => {
    if (entity !== player) {
      entity.destroy();
    }
  });
  globalWorldItems = [];
  worldMapLoaded = true;
  generateRandomMobs(worldMapTileSet, dungeonDepth, dungeonDepth * 3);
  
  player.x = 1;
  player.y = 1;

  tweenCameraToPoint(1, 1);

  await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
  
  await new Tween(0.2, [0, 1]).begin(alpha => {
    context.globalAlpha = alpha;
  });
  
  isDescending = false;
}

function isSolidTile (x, y) {
  if (isInBounds(x, y)){
    const tile = worldMapTileSet[y][x];
    return solidTiles.indexOf(tile) !== -1;
  } else {
    return true;
  }
}

function isInteractableTile(x, y){
  if (isInBounds(x, y)){
    const tile = worldMapTileSet[y][x];
    return areItemsInTile(x, y) || getEntityAtTile(x, y) !== undefined || interactableTiles.indexOf(tile) !== -1;
  } else {
    return false;
  }
}

function distance (x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getNeighboringTiles (x, y){
  return [
    { x: x + 0, y: y + -1 },
    { x: x + 1, y: y + -1 },
    { x: x + 1, y: y + 0 },
    { x: x + 1, y: y + 1 },
    { x: x + 0, y: y + 1 },
    { x: x + -1, y: y + 1 },
    { x: x + -1, y: y + 0 },
    { x: x + -1, y: y + -1 },
  ]
}

function performPathfinding (startX, startY, endX, endY) {
  const openList = [];
  const closedList = [];
  const path = [];
  const start = { x: startX, y: startY };
  const end = { x: endX, y: endY };
  const startF = distance(start.x, start.y, end.x, end.y);
  const startG = 0;
  const startH = startF;
  const startNode = {
    x: start.x,
    y: start.y,
    g: startG,
    h: startH,
    f: startF
  };
  openList.push(startNode);
  while (openList.length > 0) {
    let currentNode = openList.shift();
    if (currentNode.x === end.x && currentNode.y === end.y) {
      while (currentNode.x !== start.x || currentNode.y !== start.y) {
        path.push({ x: currentNode.x, y: currentNode.y });
        currentNode = closedList.find(node => node.x === currentNode.parent.x && node.y === currentNode.parent.y);
      }
      path.push({ x: currentNode.x, y: currentNode.y });
      return path.reverse();
    }
    closedList.push(currentNode);
    const neighbors = getNeighboringTiles(currentNode.x, currentNode.y);
    neighbors.forEach(neighbor => {
      if (isSolidTile(neighbor.x, neighbor.y)) {
        return;
      }
      const neighboringNode = closedList.find(node => node.x === neighbor.x && node.y === neighbor.y);
      if (neighboringNode) {
        return;
      }
      const neighborG = currentNode.g + 1;
      const neighborH = distance(neighbor.x, neighbor.y, end.x, end.y);
      const neighborF = neighborG + neighborH;
      const neighborNode = {
        x: neighbor.x,
        y: neighbor.y,
        g: neighborG,
        h: neighborH,
        f: neighborF,
        parent: currentNode
      };
      const openNode = openList.find(node => node.x === neighbor.x && node.y === neighbor.y);
      if (openNode) {
        if (openNode.g > neighborG) {
          openNode.g = neighborG;
          openNode.f = neighborF;
          openNode.parent = currentNode;
        }
      }
      else {
        openList.push(neighborNode);
      }
    });

    openList.sort((a, b) => a.f - b.f);
  }

  return path;
}

async function entityFollowPath (entity, path) {
  entity.currentPath = path;
  for (const point of path) {
    if (entity === player) {
      tweenCameraToPoint(point.x, point.y);
    }
    await entity.moveTo(point.x, point.y, true);
    
    if (entity.currentPath !== path) {
      return false;
    }
  }
  return true;
}

function onInteractionPerformed () {
  justPerformedInteraction = true;
  setTimeout(() => justPerformedInteraction = false, 100);
}

async function handleCellInteraction (x, y) {
  const tile = worldMapTileSet[y][x];
  const name = getTileNameByValue(tile);

  if (justPerformedInteraction) {
    return;
  }

  const isNextToTile = isNeighboringCell(player.floorX, player.floorY, x, y);
  const isntMovingToCell = player.targetCell.x !== x || player.targetCell.y !== y;
  
  if (!isNextToTile && isntMovingToCell) {
    player.targetCell.x = x;
    player.targetCell.y = y;
    
    const path = performPathfinding(player.floorX, player.floorY, x, y);

    if (path.length === 0) {
      player.targetCell.x = null;
      player.targetCell.y = null;
      return;
    }
    
    await entityFollowPath(player, path);
  }

  const [itemAtCell] = getItemsAtTile(x, y);
  const timeNow = new Date();

  const deltaX = x - player.x;

  if (deltaX < 0) {
    player.sprite.flipped = true;
  } else if (deltaX > 0) {
    player.sprite.flipped = false;
  }

  const entity = getEntityAtTile(x, y);

  if (entity && entity.isAlive && entity !== player) {
    player.attack(entity);
  }

  if (itemAtCell && !itemAtCell.isDropping) {
    if ((timeNow - player.lastCollectAttempt) / 1000 < 1) {
      return;
    }
    
    const wasPickedUp = player.collect(itemAtCell);
    if (wasPickedUp) {
      playSound('assets/sounds/snd_collect.wav');
    } else {
      playSound('assets/sounds/snd_bump.wav');
    }
    return;
  }  

  switch (tile) {
    case Tiles.LOCKED_CHEST:
      let spawnAmmount = Math.floor(Math.random() * (5 - 1) + 1) + Math.floor(dungeonDepth / 2);

      if (spawnAmmount > 8) {
        spawnAmmount = 8;
      }
      
      for (let i = 0; i < spawnAmmount; i++) {
        const item = Items.Generate(dungeonDepth).spawn(x, y);
        const neighbors = getNeighboringTiles(x, y).filter(tile => {
          return isPassableCell(tile.x, tile.y);
        });
      
        globalWorldItems.push(item);
        
        if (neighbors.length > 0) {
          const randomCell = neighbors[Math.floor(Math.random() * neighbors.length)];
          item.dropTo(randomCell.x, randomCell.y);
        } else {
          item.dropTo(x, y);
        }
      }
      
        
      playSound('assets/sounds/snd_chest.wav');
      onInteractionPerformed();
      worldMapTileSet[y][x] = Tiles.EMPTY;
      break;
    case Tiles.STAIRCASE_DOWN:
      descend();
      break;
    default:
      console.warn('Case for interaction tile ' + name + ' not created.');
      break;
  }
}

function getTileSprite (tile) {
  const sprite = new Sprite('assets/images/tileset.png', 96, 64);
  sprite.rectOffsetX = tile % 6 * 16;
  sprite.rectOffsetY = Math.floor(tile / 6) * 16;
  return sprite
}

async function handleMouseInput (mouse) {
  const mouseCellX = Math.floor((mouse.x + -worldScroll.x) / defaultTileSize);
  const mouseCellY = Math.floor((mouse.y + -worldScroll.y) / defaultTileSize);
  
  const rightMouseDown = mouse.down === 'right';
  const leftMouseDown = mouse.down === 'left';

  if (mouse.processing || backpackIsOpen || justPerformedInteraction) {
    return;
  }
  
  if (isInBounds(mouseCellX, mouseCellY)) {
    const hoveredTile = worldMapTileSet[mouseCellY][mouseCellX];
    const cellIsInteractable = isInteractableTile(mouseCellX, mouseCellY);

    if (cellIsInteractable) {
      setMouseCursor('pointer');
    } else {
      setMouseCursor('default');
    }
    
    if (leftMouseDown) {
      mouse.processing = true;
      openedSpriteInfo = null;
      await handleCellInteraction(mouseCellX, mouseCellY);
      mouse.processing = false;
    } else if (rightMouseDown) {
      const [item] = getItemsAtTile(mouseCellX, mouseCellY);
      const entity = getEntityAtTile(mouseCellX, mouseCellY);
      
      let sprite, description;
      
      if (item) {
        sprite = item.sprite;
        description = Descriptions.Items[item.index];
      } else if (entity) {
        sprite = entity.sprite;
        description = Descriptions.Entities[entity.constructor.name];
      } else {
        description = Descriptions.Tiles[hoveredTile];
        sprite = getTileSprite(hoveredTile);
      }

      openedSpriteInfo = { sprite, description };
    }
  } else {
    setMouseCursor('default');
  }
}

function tweenGlobalScroll (x, y) {
  if (worldScrollTween) {
    worldScrollTween.cancel();
  }
  
  const scrollTween = new Tween(0.2, [worldScroll.x, x], [worldScroll.y, y])
  
  scrollTween.begin((x, y) => {
    worldScroll.x = x;
    worldScroll.y = y;
  });

  worldScrollTween = scrollTween;
}

function spawnWorldEntity(entity) {
  if (entity.isAlive) {
    globalWorldEntities.push(entity);
  }
}

function removeWorldEntity(entity) {
  const worldIndexId = globalWorldEntities.indexOf(entity);

  if (worldIndexId === -1) {
    return;
  }

  globalWorldEntities.splice(worldIndexId, 1);
}

function updateAllEntities(entities) {
  entities.forEach(entity => {
    entity.update(context, canvasSizeWidth, worldScroll.x);

    if (!entity.isAlive) {
      removeWorldEntity(entity);
    }
  });
}

function beyondFOV (x, y) {
  const [screenX, screenY] = convertToScreenCoordinates(x, y);
  return isOffScreen(screenX, screenY);
}

function drawAllWorldItems(items, context){
  items.forEach(item => {
    const [screenX, screenY] = convertToScreenCoordinates(item.x, item.y);
    
    if (isOffScreen(screenX, screenY)) {
      return;
    }
    
    item.sprite.update(screenX, screenY, defaultTileSize, context);
  });
}

function generateRandomMobs (tiles, depth, maxEntities) {
  for (let y = 0; y < tiles.length; y++) {
    const row = tiles[y];
    for (let x = 0; x < row.length; x++){
      const isPassable = isPassableCell(x, y);
      const outOfView = beyondFOV(x, y);
      const hasNotHitLimit = globalWorldEntities.length - 1 < maxEntities;

      if (isPassable && outOfView && hasNotHitLimit) {
        const chance = Math.random() * 100;

        if (chance < 5) {
          const skeleton = new Skeleton(x, y);
          spawnWorldEntity(skeleton);
        }
      }
    }
  }
}

function initGameLoop() {
  context.globalAlpha = 0;
  spawnWorldEntity(player);
  tweenCameraToPoint(player.x, player.y);
  
  descend();
    
  setInterval(function update() {
    onBeforeGameRender(context);
    handleKeyboardInput(keys);
    handleWorldScrolling(keys);
    drawGlobalTiles(context, worldMapTileSet);
    updateAllEntities(globalWorldEntities);
    drawAllWorldItems(globalWorldItems, context);
    handleMouseInput(mouse);
    drawOnScreenUI(context);
    onAfterGameRender(context);
  }, gameTickSpeed * 1000);
}

tileSetImage.onload = () => initGameLoop();

document.addEventListener('keydown', ({ key }) => { keys[key] = 1; });
document.addEventListener('keyup', ({ key }) => { delete keys[key]; });

canvas.addEventListener('mousemove', ({ offsetX, offsetY }) => { mouse.x = offsetX; mouse.y = offsetY });
canvas.addEventListener('mousedown', (e) => { e.preventDefault(); mouse.down = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'none'; });
canvas.addEventListener('mouseup', (e) => { e.preventDefault(); mouse.down = 'none' });
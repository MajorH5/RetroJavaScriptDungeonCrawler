export const Items = (function () {
  function Item (name, index, hotbarCell, useHandler) {
    this.hotbarCell = hotbarCell;
    this.name = name;
    this.index = index;
    this.use = useHandler;
  }

  Item.prototype.spawn = function (x, y) {
    const self = new Item(this.name, this.index, this.hotbarCell, this.use);
    const offsetX = this.index % 8 * 16;
    const offsetY = Math.floor(this.index / 8) * 16;

    self.sprite = new Sprite('assets/images/items.png', 128, 96);
    self.sprite.rectOffsetX = offsetX;
    self.sprite.rectOffsetY = offsetY;
    self.x = x;
    self.y = y;
    
    return self;
  }

  Item.prototype.dropTo = async function (x, y) {
    this.isDropping = true;
    await new Tween(0.5, [this.x, x], [this.y, y]).begin((x, y) => {
      this.x = x;
      this.y = y;
    });
    this.isDropping = false;
    // await new Tween(0.1, [this.y, y - 0.3).begin(y => this.y = y);
    // await new Tween(0.1, [this.y, y + 0.3]).begin(y => this.y = y);
  }
  
  const Items = {};

  const randomInt = (min, max) => {
    return Math.random() * (max - min) + min;
  };

  Items.Generate = function (depth) {
    let items;

    if (depth === 1) {
      items = [
        [Items.SWORD, 0.1],
        [Items.AMULET, 0.1],
        [Items.STRENGTH, 0.2],
        [Items.HEALTH, 0.4]
      ];
    } else if (depth > 1 && depth <= 3) {
      items = [
        [Items.DIVINE_SHIELD, 0.1],
        [Items.LONGSWORD, 0.2],
        [Items.STRENGTH, 0.2],
        [Items.SWORD, 0.3],
        [Items.CHESTPLATE, 0.3],
        [Items.HEALTH, 0.4]
      ]
    } else if (depth > 3 && depth <= 6) {
      items = [
        [Items.DIVINE_SHIELD, 0.3],
        [Items.LONGSWORD, 0.4],
        [Items.STRENGTH, 0.4],
        [Items.CHESTPLATE, 0.4],
        [Items.HEALTH, 0.5]
      ]
    } else {
      items = [
        [Items.STRENGTH, 0.3],
        [Items.LONGSWORD, 0.5],
        [Items.CHESTPLATE, 0.5],
        [Items.DIVINE_SHIELD, 0.5],
        [Items.HEALTH, 0.5]
      ]
    }

    let item = null;
      
    while (item === null) {
      const random = Math.random();

      for (const [potentialItem, chance] of items) {
        if (random <= chance) {
          item = potentialItem;
          break;
        }
      }
    }

    return item;
  }

  Items.SWORD = new Item('Sword', 0, 0, function () {
    return randomInt(2, 4);
  });
  
  Items.AMULET = new Item('Amulet', 1, 3, function () {
    return randomInt(0, 3);
  });
  
  Items.HEALTH = new Item('Health', 2, null, function (player) {
    console.log('Heal me up!');
    if (player.health < player.maxHealth) {
      player.health = 100;
      return true;
    } else {
      return false;
    }
  });

  Items.DIVINE_SHIELD = new Item('Divine Shield', 3, 1, function () {
    return Math.random() < .2;
  });

  Items.CHESTPLATE = new Item('Chestplate', 4, 2, function () {
    return 2;
  });

  Items.STRENGTH = new Item('Strength', 5, null, function (player) {
    player.strength++;
    return true;
  });

  Items.LONGSWORD = new Item('Longsword', 6, 0, function () {
    return randomInt(4, 7);
  });

  Items.HATCHET = new Item('Hatchet', 7, 0, function () {
    return randomInt(4, 6);
  })

  Items.Cooldowns = {
    ['Sword']: 1 / 3,
    ['Hatchet']: 1 / 4.8,
    ['Longsword']: 1,
    ['Amulet']: 1
  };

  return Items
})();
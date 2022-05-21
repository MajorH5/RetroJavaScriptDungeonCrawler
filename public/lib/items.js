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

  Items.Cooldowns = {
    ['Sword']: 1 / 3
  };

  return Items
})();
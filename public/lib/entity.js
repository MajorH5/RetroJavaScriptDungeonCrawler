export const Entity = (function() {
  return class {
    static tweenSpeed = 0.2;

    constructor(x, y, sprite) {
      this.lastMovement = -Infinity;
      this.isAlive = true;
      this.isMoving = false;
      this.currentPath = null;
      this.targetCell = {x: null, y: null};
      this.damageSoundId = 1;
      this.moveTween = null;
      this.sprite = sprite;
      this.maxHealth = 100
      this.health = this.maxHealth;
      this.hpBarOffset = 5;
      this.hpBarDuration = 3;
      this.lastDamaged = -Infinity;
      this.path = null;
      this.x = x;
      this.y = y;
    }

    setMaxHealth (max){
      this.maxHealth = max;
      if (this.health > max){
        this.health = max;
      }
    }
    
    drawHpBar () {
      const timeNow = new Date();
      const healthPercentage = this.health / this.maxHealth;
      const shouldDrawHpBar = this.health < this.maxHealth && (timeNow - this.lastDamaged) / 1000 < this.hpBarDuration;
      
      if (shouldDrawHpBar){
        const hpBarWidth = defaultTileSize;
        const hpBarHeight = 10;
                
        const [screenX, screenY] = convertToScreenCoordinates(this.x, this.y);
    
        context.strokeStyle = Colors.WHITE;
        context.fillStyle = Colors.BLACK;
    
        const hpBarPositionX = screenX + defaultTileSize / 2 - hpBarWidth / 2;
        const hpBarPositionY = screenY - hpBarHeight - this.hpBarOffset;
        
        context.beginPath();
        context.rect(hpBarPositionX, hpBarPositionY, hpBarWidth, hpBarHeight);
        context.fill();
        context.stroke();
    
        context.fillStyle = Colors.RED;
    
        let hpBarRenderWidth = (hpBarWidth * healthPercentage) - 3;
    
        if (hpBarRenderWidth < 0) {
          hpBarRenderWidth = 0;
        }
        
        context.fillRect(hpBarPositionX + 1.5, hpBarPositionY + 1.5, hpBarRenderWidth, hpBarHeight - 3);
      }
    }

    setHealth (health) {
      const change = health - this.health;
  
      if (change > 0) {
        const heal = new Audio('assets/sounds/snd_heal.wav');
        heal.play();
      } else if (change < 0) {
        this.lastDamaged = new Date();

        const assetURL = 'assets/sounds/snd_hit' + this.damageSoundId + '.wav';
        const damage = new Audio(assetURL);

        damage.play();

        let randomInt;
        
        do {
          randomInt = Math.floor(Math.random() * (5 - 1) + 1);
        } while (randomInt === this.damageSoundId);

        this.damageSoundId = randomInt
      }

      this.health = health;
    }
    
    get floorX () {
      return Math.floor(this.x);
    }
    
    get floorY () {
      return Math.floor(this.y);
    }

    destroy() {
      this.isAlive = false;
    }

    async hitCell (x, y, speed) {      
      const travelX = (x - this.floorX) / 2;
      const travelY = (y - this.floorY) / 2;

      const toCell = new Tween(speed, [this.x, this.x + travelX], [this.y, this.y + travelY]);

      this.moveTween = toCell;
      
      await toCell.begin((x, y) => {
        if (!this.isMoving) {
          this.x = x;
          this.y = y;
        } else {
          toCell.cancel();
        }
      });
      
      const backCell = new Tween(speed, [this.x, this.x - travelX], [this.y, this.y - travelY]);

      this.moveTween = backCell;
      
      backCell.begin((x, y) => {
        if (!this.isMoving) {
          this.x = x;
          this.y = y;
        } else {
          backCell.cancel();
        }
      });
    }

    pause (seconds) {
      return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    }

    damage (amount) {
      if (!this.isAlive){
        return;
      }
      
      let nextHealth = this.health - amount;

      if (nextHealth < 0) {
        nextHealth = 0;
      }
      
      if (nextHealth === 0) {
        const death = new Audio('assets/sounds/snd_death.wav');
        death.play();
        
        this.destroy();
      }
      
      this.setHealth(nextHealth);
    }

    async moveTo(x, y, tween) {
      this.lastMovement = new Date();
      
      if (tween) {
        if (this.isMoving && this.moveTween) {
          console.log(this.moveTween, '<--');
          this.moveTween.cancel();
        }

        this.isMoving = true;

        this.sprite.playAnimation(Animations.WALK);
        
        const movementTween = new Tween(Entity.tweenSpeed, [this.x, x], [this.y, y])

        this.moveTween = movementTween;

        const deltaX = x - this.x;
        
        if (deltaX < 0) {
          this.sprite.flipped = true;
        } else if (deltaX > 0) {
          this.sprite.flipped = false;
        }
        
        await movementTween.begin((x, y) => {
          this.x = x;
          this.y = y;
        });

        this.isMoving = false;
        this.moveTween = null;

        this.sprite.stopAnimation();
      } else {
        this.x = x;
        this.y = y;
      }
    }


    update(context, canvasWidth, worldScrollX) {
      const [screenX, screenY] = convertToScreenCoordinates(this.x, this.y);
      this.sprite.update(screenX, screenY, defaultTileSize, context, canvasWidth, worldScrollX);
      this.drawHpBar();

      if (Settings.showEntityBounds){
        context.strokeStyle = Colors.WHITE;
        context.strokeRect(screenX, screenY, defaultTileSize, defaultTileSize);
      }

      if (Settings.showPathfinding && this.path && !gameIsOver){
        this.path.forEach(({x, y}) => {
          const [screenX, screenY] = convertToScreenCoordinates(x, y);
          const alpha = context.globalAlpha;
          
          context.globalAlpha = 0.5;
          context.fillStyle = '#0000ff';
          context.fillRect(screenX, screenY, defaultTileSize, defaultTileSize);
          context.globalAlpha = alpha;
        });
      }

    }
  }
})();
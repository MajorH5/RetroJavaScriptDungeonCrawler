export const Sprite = (function() {
  return class {
    constructor (assetURL, width, height) {
      this.image = new Image(width, height);
      this.image.onload = () => {};
      this.image.src = assetURL;
      this.lastFrameChange = -Infinity;
      this.currentFrame = 0;
      this.rectOffsetX = 0;
      this.rectOffsetY = 0;
      this.FPS = 1 / 10;
      this.animation = null;
      this.animationPaused = false;
      this.visible = true;
      this.flipped = false;
    }

    playAnimation (animation) {
      if (typeof animation !== 'object') {
        throw new Error('Invalid type recieved for playAnimation.');
      }
      if (this.animation === animation) {
        return;
      }

      this.animationPaused = false;
      this.animation = animation;
      this.currentFrame = 0;
    }

    stopAnimation () {
      this.animation = null;
      this.rectOffsetX = 0;
      this.rectOffsetY = 0;
    }

    pauseAnimation () {
      this.animationPaused = true;
    }

    resumeAnimation () {
      this.animationPaused = false;
    }

    update (screenX, screenY, tileSize, context, canvasWidth, scroll) {
      const timeNow = new Date();
      const shouldMoveFrame = (timeNow - this.lastFrameChange) / 1000 >= this.FPS;
      const activeAnimation = this.animationPaused === false && this.animation;

      if (shouldMoveFrame && activeAnimation) {
        const activeFrame = activeAnimation.frames[this.currentFrame];
        const [rectOffsetX, rectOffsetY] = activeFrame;

        this.rectOffsetX = rectOffsetX * 16;
        this.rectOffsetY = rectOffsetY * 16;
        
        this.currentFrame += 1;
        
        const animationIsComplete = this.currentFrame === activeAnimation.frames.length;
        const animationIsLooped = activeAnimation.looped === true;
        
        if (animationIsComplete) {
          if (animationIsLooped) {
            this.currentFrame = 0;
          } else {
            this.animation = null;
          }
        }

        this.lastFrameChange = timeNow;
      }
      
      if (this.visible) {
        // if (this.flipped) {
        //   context.save()
        //   context.scale(-1, 1);
        // }
        context.drawImage(
          this.image, this.rectOffsetX, this.rectOffsetY,
          // 16, 16, screenX + (this.flipped ? (-canvasWidth) : 0), screenY,
          16, 16, screenX, screenY,
          tileSize, tileSize
        );
        // if (this.flipped){
        //   context.restore();
        // }
      }
    }
  }
})();
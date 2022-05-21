export const Tween = (function() {
  return class {
    static updateRate = (1 / 60) * 1000;

    constructor(duration, ...tweenData) {
      const tweens = [];
      for (const [start, goal] of tweenData) {
        tweens.push({
          value: start,
          start: start,
          goal: goal
        });
      }
      this.tweens = tweens;
      this.active = true;
      this.elapsed = 0;
      this.duration = duration;
    }
    
    cancel() {
      this.active = false;
    }
    
    begin(handler) {
      if (typeof handler !== 'function') {
        throw new Error('Expected type function to Tween.begin.');
      }
      
      return new Promise((resolve) => {
        const onTweenCompleted = () => {
          this.cancel();
          clearInterval(intervalId);
          resolve(this.value);
        };
        let lastUpdate = new Date();

        const intervalId = setInterval(() => {
          if (!this.active) {
            onTweenCompleted();
            return;
          }

          const timeNow = new Date();
          const elapsed = (timeNow - lastUpdate) / 1000;

          this.elapsed += elapsed;

          if (this.elapsed > this.duration) {
            this.elapsed = this.duration;
          }

          const percentage = (this.elapsed / this.duration);
          const values = [];
          
          for (const tween of this.tweens) {
            tween.value = tween.start + (tween.goal - tween.start) * percentage;
            values.push(tween.value);
          }

          try {
            handler(...values);
          } catch (e) { console.error(e) };

          if (this.elapsed === this.duration) {
            onTweenCompleted();
            return;
          }

          lastUpdate = timeNow;
        }, Tween.updateRate);
      });
    }
  }
})();
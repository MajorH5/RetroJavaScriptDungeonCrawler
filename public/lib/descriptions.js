export const Descriptions = (function () {
  const Tiles = {
    [0]: 'There is nothing here',
    [1]: 'Weeds sprout from the hard floor',
    [2]: 'Dead worms lie on the ground',
    [3]: 'A pearly, hardened, crystaline-like\nbrick structure',
    [4]: 'A stairwell leading deeper into\nthe dungeon',
    [5]: 'A chest with a padlock.\nSomething glimmers inside',
  };

  const Items = {
    [0]: 'A worn old sword',
    [1]: 'A dusty ancient amulet. You feel a\nfaint magical power lurking within',
    [2]: 'A vial of healing elixir',
    [3]: 'A robust shield blessed with divine\npower',
    [4]: 'A simple steel-reinforced\nchestplate',
    [5]: 'A flask of potent pure strength',
    [6]: 'A longsword sword used by\ngreat warriors',
    [7]: 'A sturdy copper battle hatchet'
  };

  const Entities = {
    ['Player']: 'It\'s you. You stand at ready with\nyour sword, helmet, and shield',
    ['Skeleton']: 'An undead yet animated skeleton.\nIt\'s bones are red with dried blood'
  };
  
  return { Tiles, Items, Entities };
})();
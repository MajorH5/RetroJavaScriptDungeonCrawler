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
    [2]: 'A Vial of healing elixir',
  };

  const Entities = {
    ['Player']: 'It\'s you. You stand at ready with\nyour sword, helmet, and shield',
    ['Skeleton']: 'An undead yet animated skeleton.\nIt\'s bones are red with dried blood'
  };
  
  return { Tiles, Items, Entities };
})();
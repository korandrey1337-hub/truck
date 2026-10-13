window.HUB_PROGRESS = {
  game: 'wb-truck-survivor',
  keys: ['vpTruckSurvivorsBest'],
  score: function (keys) { return Number(keys.vpTruckSurvivorsBest) || 0; }
};

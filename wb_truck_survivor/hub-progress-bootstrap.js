HubCloud.init(window.HUB_PROGRESS).then(function () {
  var game = document.createElement('script');
  game.src = './game.js?v=hub-cloud-1';
  document.body.appendChild(game);
});

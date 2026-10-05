// ── Boot: the title screen over a drifting pond ──
(function () {
  'use strict';
  G.addSystem({
    name: 'boot',
    init: function () {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) { G.touch = true; document.body.classList.add('touch'); }
      G.startTitlePond();
      G.buildTitle();
      if (G.pendingSave && G.showContinue) G.showContinue(true);
    },
  });
  G.on('resize', function () { if (G.W) { G.W.ww = G.view.ww; G.W.wh = G.view.wh; } });
})();

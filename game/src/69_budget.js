// ── What a session may spend on the things that happen by themselves ──
// One place for the limits on the AI calls nobody typed for: how far apart (milliseconds of real time) and how many in one
// sitting. Worked out so that an hour of play costs cents, not dollars, whatever the speed:
//   a plan          about 1.2 cents, and about 5 cents more if they build something (its picture)   at most 12
//   a marvel        about 1.2 cents                                                                  at most 12
//   the pond's own event  about 1.7 cents                                                            at most 10, five minutes apart
//   the wish, looked at   about 0.35 cents                                                           once a minute, at most 60
// Together: at most about a dollar and a quarter in a sitting, and usually far less.
(function () {
  'use strict';
  if (!G.ai) return;
  const g = G.ai.gaps, c = G.ai.caps;
  g.deed = 90000; c.deed = 12;
  g.marvel = 120000; c.marvel = 12;
  g.nature = 300000; c.nature = 10;
  g.wishcheck = 60000; c.wishcheck = 60;
  c.figure = 14;
})();

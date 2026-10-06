// ── The pace of the things that happen by themselves ──
// One place for how far apart (milliseconds of real time) the AI calls nobody typed for may be. It sets the PACE only: a
// sitting is not cut off after so many (the old, generous limits of each kind stay as they were, as a safety net).
//   a plan: about 1.2 cents, and about 5 cents more if they build something (its picture)     at least 90 s apart
//   a marvel: about 1.2 cents                                                                 at least 2 min apart
//   the pond's own event: about 1.7 cents                                                     at least 5 min apart
//   the wish, looked at: about 0.35 cents                                                     once a minute
// All of them keep real time, so an hour costs the same at any speed: about a dollar and a quarter if everything fires as often as it may.
(function () {
  'use strict';
  if (!G.ai) return;
  const g = G.ai.gaps, c = G.ai.caps;
  g.deed = 90000; c.deed = 40;
  g.marvel = 120000;
  g.nature = 300000;
  g.wishcheck = 60000;
})();

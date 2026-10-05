// Start the server for local development:   node scripts/dev.js [--fake]
//   --fake   use a fake model (instant, free) so the AI path can be tried without an API key
// Then open  http://localhost:8787/dev?user=you   — a page that hosts the game the way a site would.
'use strict';
const { createApp } = require('../server');
const { fakeModel } = require('../test/helpers');

const fake = process.argv.includes('--fake');
const app = createApp(fake ? { callModel: fakeModel(), perHour: 1000 } : {});
const port = Number(process.env.PORT) || 8787;
app.server.listen(port, () => console.log('Primordia dev server on http://localhost:' + port + '/dev' + (fake ? '  (fake model)' : '')));

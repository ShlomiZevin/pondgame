// SVG from a model is never trusted. Only simple shapes survive: no scripts, no links, no text.
'use strict';

const TAGS = new Set(['svg', 'g', 'circle', 'ellipse', 'rect', 'path', 'polygon', 'polyline', 'line', 'defs', 'lineargradient', 'radialgradient', 'stop']);
const ATTRS = new Set(['viewbox', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'd', 'points', 'fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'offset', 'stop-color', 'stop-opacity', 'id', 'xmlns', 'stroke-linecap', 'stroke-linejoin']);

// SVG names are case-sensitive; the allow-lists above are lower case
const CASE = { viewbox: 'viewBox', lineargradient: 'linearGradient', radialgradient: 'radialGradient' };
const proper = (n) => CASE[n] || n;

function cleanValue(v) {
  v = String(v);
  if (/javascript|data:|http|<|>|script|expression|@import/i.test(v)) return null;
  if (/url\s*\(\s*(?!#)/i.test(v)) return null;
  return v.slice(0, 600);
}

/** Returns a clean SVG string, or '' if there is nothing safe in it. */
function sanitizeSvg(input, lim) {
  let s = String(input || '');
  const maxLen = (lim && lim.maxLen) || 6000, maxNodes = (lim && lim.maxNodes) || 40;
  if (s.length > maxLen) return '';
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '');
  if (!/<svg[\s>]/i.test(s)) return '';
  const out = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
  let m, sawSvg = false, nodes = 0;
  const stack = [];
  while ((m = re.exec(s))) {
    const closing = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3] || '', self = m[4] === '/';
    if (!TAGS.has(tag)) continue;
    if (closing) {
      const at = stack.lastIndexOf(tag);
      if (at >= 0) { while (stack.length > at) out.push('</' + proper(stack.pop()) + '>'); }
      continue;
    }
    if (++nodes > maxNodes) break;
    if (tag === 'svg' && sawSvg) continue;
    if (tag === 'svg') sawSvg = true;
    if (!sawSvg) continue;
    let a = '';
    const ar = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let am;
    while ((am = ar.exec(attrs))) {
      const name = am[1].toLowerCase();
      if (!ATTRS.has(name) || name.startsWith('on')) continue;
      const val = cleanValue(am[2] !== undefined ? am[2] : am[3]);
      if (val === null) continue;
      a += ' ' + proper(name) + '="' + val.replace(/"/g, '&quot;') + '"';
    }
    if (tag === 'svg' && !/xmlns=/.test(a)) a += ' xmlns="http://www.w3.org/2000/svg"';
    if (self) out.push('<' + proper(tag) + a + '/>'); else { out.push('<' + proper(tag) + a + '>'); stack.push(tag); }
  }
  while (stack.length) out.push('</' + proper(stack.pop()) + '>');   // close anything left open
  const res = out.join('');
  return /^<svg[\s>]/.test(res) && /<\/svg>$/.test(res) ? res : '';
}

module.exports = { sanitizeSvg };

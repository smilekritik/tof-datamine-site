export const OOW_CHART_THEME_COOKIE = 'tof-oow-chart-theme';
export const OOW_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 365;

export function renderMechanicContent(rawHtml, React) {
  if (!rawHtml) return '';
  const text = String(rawHtml)
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  if (!text.includes('<span') || !React) return text.replace(/<[^>]+>/g, '');
  const parts = [];
  const regex = /<span(?:\s+class=["']([^"']*)["'])?>([\s\S]*?)<\/span>/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const className = match[1] ? `oow-mechanics-accent ${match[1]}` : 'oow-mechanics-accent';
    parts.push(React.createElement('span', { key: key++, className }, match[2]));
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function readOowCookie(name, cookie = document.cookie) {
  const prefix = encodeURIComponent(name) + '=';
  const entry = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
}

export function resolveOowChartTheme(cookie = document.cookie) {
  return readOowCookie(OOW_CHART_THEME_COOKIE, cookie) === 'dark' ? 'dark' : 'light';
}

export function writeOowCookie(name, value, doc = document, loc = location) {
  const secure = loc.protocol === 'https:' ? '; Secure' : '';
  doc.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + '; Max-Age=' + OOW_PREFERENCE_MAX_AGE + '; Path=/datamine/oow/; SameSite=Lax' + secure;
}

export function getDialogControls(dialog) {
  if (!dialog) return [];
  return Array.from(dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'))
    .filter((control) => control.getAttribute('aria-hidden') !== 'true' && !control.closest('[inert]') && control.getClientRects().length > 0);
}

export function syncDialogInertState(doc, modalOpen, zoomOpen) {
  doc.querySelectorAll('[data-datamine-header], .oow-main-wrap, [data-datamine-footer], [data-scroll-top]').forEach((surface) => {
    surface.inert = !!modalOpen;
  });
  const bossDialog = doc.querySelector('[data-oow-dialog="boss"]');
  if (!bossDialog) return;
  bossDialog.inert = !!zoomOpen;
  if (zoomOpen) bossDialog.setAttribute('aria-hidden', 'true');
  else bossDialog.removeAttribute('aria-hidden');
}

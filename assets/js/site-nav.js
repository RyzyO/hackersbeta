/**
 * Shared site navigation + mobile menu.
 *
 * Usage per page:
 *   <link rel="stylesheet" href="assets/css/site-nav.css">
 *   ...
 *   <div id="site-nav-root"></div>
 *   <script src="assets/js/site-nav.js"></script>
 *
 * Each page's own Firebase/auth code should call:
 *   window.SiteNav.setDisplayName(displayName)
 *   window.SiteNav.setHackerNumber(hackerNumber)
 *   window.SiteNav.setAvatar(avatarUrl)   // pass null/falsy to clear
 * once it has that data — this file has no Firebase dependency itself.
 *
 * All three write through to a localStorage cache (shared across every page, and
 * across days) so repeat page loads paint the last-known name/number/avatar
 * instantly instead of waiting on Firebase. Call window.SiteNav.getCachedProfile()
 * to read it back — e.g. to paint a hero "Welcome, {name}" before Firebase responds.
 * Firebase's real-time listeners still run as normal afterwards and refresh both
 * the DOM and the cache once fresh data arrives.
 *
 * Icons are inlined as raw SVG (Lucide icon set, ISC license) rather than pulled
 * from a CDN — same reasoning as scoring.html: zero extra requests, no risk of an
 * upstream "latest" release changing shapes under us, works with no JS dependency
 * beyond this file.
 */
(function () {
  const ICON_PATHS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'clipboard-list': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    'credit-card': '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    'calendar-days': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    'cloud-sun': '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
    'trending-up': '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    menu: '<line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/>',
  };

  function icon(name, cls) {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
  }

  const NAV_LINKS = [
    { href: 'index.html', label: 'Home', icon: 'home', group: null },
    { href: 'register.html', label: 'Register', icon: 'clipboard-list', group: 'Event' },
    { href: 'venue.html', label: 'Venue', icon: 'map-pin', group: 'Event' },
    { href: 'payment.html', label: 'Payment', icon: 'credit-card', group: 'Event' },
    { href: 'schedule.html', label: 'Schedule', icon: 'calendar-days', group: 'Event' },
    { href: 'weather.html', label: 'Weather', icon: 'cloud-sun', group: 'Event' },
    { href: 'podcast.html', label: 'Podcast', icon: 'mic', group: 'More' },
    { href: 'score.html', label: 'Score', icon: 'trending-up', group: 'More' },
    { href: 'honour-roll.html', label: 'Honour Roll', icon: 'trophy', group: 'More' },
    { href: 'notifications-center.html', label: 'Notifications', icon: 'bell', group: 'More' },
  ];

  function currentFile() {
    const file = window.location.pathname.split('/').pop();
    return file || 'index.html';
  }

  function desktopEventLinksHtml() {
    return NAV_LINKS.filter(l => l.group === 'Event').map(l =>
      `<a href="${l.href}" data-nav="${l.href}" class="nav-desktop-link block px-4 py-2 hover:bg-hackers-sky/20">${l.label}</a>`
    ).join('');
  }

  function desktopTailLinksHtml() {
    return NAV_LINKS.filter(l => l.group === 'More').map(l =>
      `<a href="${l.href}" data-nav="${l.href}" class="nav-desktop-link px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">${l.label}</a>`
    ).join('');
  }

  function mobileGroupHtml(groupName) {
    return NAV_LINKS.filter(l => l.group === groupName).map(l => `
      <a href="${l.href}" data-nav="${l.href}" class="nav-mobile-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
        ${icon(l.icon, 'w-4 h-4 flex-shrink-0')} ${l.label}
      </a>`).join('');
  }

  const NAV_HTML = `
    <nav class="fixed top-0 w-full z-40 glass border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex-shrink-0 flex items-center gap-3">
            <a href="index.html" class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-hackers-navy">
                <img src="assets/images/logo.png" alt="Hackers Cup Logo" class="w-8 h-8 object-contain">
              </div>
              <span class="font-bold text-xl tracking-tight site-nav-logo-text">HACKERS CUP 26</span>
            </a>
          </div>

          <div class="hidden md:flex items-center space-x-1">
            <a href="index.html" data-nav="index.html" class="nav-desktop-link px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">Home</a>
            <div class="relative" id="eventDropdownWrap">
              <button id="eventDropdownBtn" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1">Event</button>
              <div id="eventDropdownMenu" class="absolute left-0 mt-0 w-44 bg-hackers-navy text-white rounded-lg shadow-lg opacity-0 pointer-events-none transition-opacity z-50">
                ${desktopEventLinksHtml()}
              </div>
            </div>
            ${desktopTailLinksHtml()}
            <div class="relative group" id="profileMenuContainer">
              <button id="profileMenuButton" class="w-10 h-10 rounded-full bg-hackers-navy text-hackers-sky font-bold flex items-center justify-center text-lg hover:ring-2 hover:ring-hackers-sky/60 transition-all overflow-hidden" onclick="window.location.href='profile.html'">
                <span id="navbarHackerNumber">#</span>
              </button>
              <div class="absolute right-0 mt-0 w-44 bg-hackers-navy text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity z-50" tabindex="0">
                <a href="profile.html" class="block px-4 py-2 hover:bg-hackers-sky/20">Profile</a>
                <a href="notifications-center.html" class="block px-4 py-2 hover:bg-hackers-sky/20">Notifications</a>
              </div>
            </div>
          </div>

          <div class="md:hidden">
            <button id="mobileMenuBtn" class="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
              ${icon('menu', 'w-6 h-6')}
            </button>
          </div>
        </div>
      </div>

      <div id="mobile-menu-backdrop" class="hidden md:hidden fixed inset-0 bg-black/50 z-40 opacity-0 transition-opacity duration-300" style="backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"></div>

      <div id="mobile-menu" class="hidden md:hidden fixed top-16 left-0 right-0 z-40 liquid-glass rounded-b-2xl max-h-[calc(100vh-4rem)] overflow-y-auto opacity-0 -translate-y-2 transition-all duration-300 ease-out">
        <div class="px-4 pt-3 pb-4 space-y-1">
          <a href="profile.html" class="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-2">
            <div class="w-10 h-10 rounded-full bg-hackers-navy text-hackers-sky font-bold flex items-center justify-center text-base overflow-hidden flex-shrink-0" id="mobileProfileAvatarWrap">
              <span id="mobileNavbarHackerNumber">#</span>
            </div>
            <div>
              <div class="text-sm font-semibold text-white">My Profile</div>
              <div class="text-xs text-gray-400">View profile &amp; notifications</div>
            </div>
          </a>

          ${mobileGroupHtml(null)}

          <div class="pt-2 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Event</div>
          ${mobileGroupHtml('Event')}

          <div class="pt-2 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">More</div>
          ${mobileGroupHtml('More')}
        </div>
      </div>
    </nav>
  `;

  function highlightActiveLinks() {
    const file = currentFile();
    document.querySelectorAll('.nav-mobile-link').forEach(link => {
      if (link.dataset.nav === file) {
        link.classList.remove('text-gray-300');
        link.classList.add('text-white', 'bg-hackers-sky/30');
      }
    });
    document.querySelectorAll('.nav-desktop-link').forEach(link => {
      if (link.dataset.nav === file) {
        link.classList.remove('text-gray-300');
        link.classList.add('text-white', 'bg-white/10');
      }
    });
  }

  function wireEventDropdown() {
    const wrap = document.getElementById('eventDropdownWrap');
    const menu = document.getElementById('eventDropdownMenu');
    if (!wrap || !menu) return;
    const show = () => { menu.classList.remove('opacity-0', 'pointer-events-none'); menu.classList.add('opacity-100', 'pointer-events-auto'); };
    const hide = () => { menu.classList.add('opacity-0', 'pointer-events-none'); menu.classList.remove('opacity-100', 'pointer-events-auto'); };
    wrap.addEventListener('mouseenter', show);
    wrap.addEventListener('mouseleave', hide);
  }

  function wireMobileMenu() {
    const menuEl = document.getElementById('mobile-menu');
    const backdropEl = document.getElementById('mobile-menu-backdrop');
    const btnEl = document.getElementById('mobileMenuBtn');
    if (!menuEl || !backdropEl || !btnEl) return;

    function open() {
      menuEl.classList.remove('hidden');
      backdropEl.classList.remove('hidden');
      requestAnimationFrame(() => {
        menuEl.classList.remove('opacity-0', '-translate-y-2');
        backdropEl.classList.remove('opacity-0');
      });
      btnEl.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      menuEl.classList.add('opacity-0', '-translate-y-2');
      backdropEl.classList.add('opacity-0');
      btnEl.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      setTimeout(() => {
        menuEl.classList.add('hidden');
        backdropEl.classList.add('hidden');
      }, 300);
    }

    btnEl.addEventListener('click', () => {
      if (menuEl.classList.contains('hidden')) open(); else close();
    });
    backdropEl.addEventListener('click', close);
    menuEl.addEventListener('click', (e) => {
      if (e.target.closest('a')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menuEl.classList.contains('hidden')) close();
    });
  }

  // Local profile cache — shows last-known name/hacker number/avatar instantly on
  // every page load (and across days), instead of waiting on Firebase every time.
  // Firebase's real-time listeners still run as normal and refresh both the DOM
  // and this cache once fresh data arrives; the cache just removes the initial wait.
  const CACHE_KEY = 'hc_profile_cache_v1';

  function readCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }

  function writeCache(partial) {
    try {
      const current = readCache();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...current, ...partial }));
    } catch (err) {
      // Storage full/unavailable (private browsing etc.) — cache is a nice-to-have, skip silently.
    }
  }

  function applyAvatar(wrapId, numberSpanId, avatarUrl) {
    const wrap = document.getElementById(wrapId);
    const numberSpan = document.getElementById(numberSpanId);
    if (!wrap) return;
    let img = wrap.querySelector('img.navbar-avatar-img');

    if (avatarUrl) {
      if (numberSpan) numberSpan.style.display = 'none';
      if (!img) {
        img = document.createElement('img');
        img.className = 'navbar-avatar-img w-full h-full object-cover rounded-full';
        img.alt = 'Profile picture';
        wrap.appendChild(img);
      }
      img.src = avatarUrl;
    } else {
      if (img) img.remove();
      if (numberSpan) numberSpan.style.display = '';
    }
  }

  window.SiteNav = {
    // Returns the last-known profile ({ displayName, hackerNumber, avatarUrl }) so a
    // page can paint instantly before Firebase responds. Fields are omitted if never cached.
    getCachedProfile() {
      return readCache();
    },
    setDisplayName(displayName) {
      if (!displayName) return;
      writeCache({ displayName });
    },
    setHackerNumber(hackerNumber) {
      if (!hackerNumber) return;
      const desktop = document.getElementById('navbarHackerNumber');
      const mobile = document.getElementById('mobileNavbarHackerNumber');
      if (desktop) desktop.textContent = hackerNumber;
      if (mobile) mobile.textContent = hackerNumber;
      writeCache({ hackerNumber });
    },
    setAvatar(avatarUrl) {
      applyAvatar('profileMenuButton', 'navbarHackerNumber', avatarUrl);
      applyAvatar('mobileProfileAvatarWrap', 'mobileNavbarHackerNumber', avatarUrl);
      writeCache({ avatarUrl: avatarUrl || '' });
    },
  };

  function applyCachedProfile() {
    const cached = readCache();
    if (cached.hackerNumber) window.SiteNav.setHackerNumber(cached.hackerNumber);
    if (cached.avatarUrl) window.SiteNav.setAvatar(cached.avatarUrl);
  }

  function init() {
    const root = document.getElementById('site-nav-root');
    if (!root) return;
    root.innerHTML = NAV_HTML;
    highlightActiveLinks();
    wireEventDropdown();
    wireMobileMenu();
    applyCachedProfile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

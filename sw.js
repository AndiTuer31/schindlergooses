// ── Schindlergooses Service Worker ──
// Handles scheduled push notifications at 19:00 the evening before workdays

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Handle push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Schindlergooses 🪿', {
      body: data.body || '',
      icon: './icon.png',
      badge: './icon.png',
      tag: 'daily-reminder',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: self.location.origin + self.location.pathname.replace('sw.js','') }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow(e.notification.data?.url || '/');
    })
  );
});

// ── Local scheduled check (fires every minute when SW is alive) ──
// This is the fallback: if no server-side push, we use a periodic alarm via setInterval
// The SW uses a workaround: it wakes when the page is open, and checks once a minute
let lastCheck = '';

self.addEventListener('message', e => {
  if (e.data?.type === 'CHECK_NOTIFICATION') {
    checkAndNotify(e.data.firebaseData);
  }
});

async function checkAndNotify(firebaseData) {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dayKey = now.toDateString();

  // Only fire once per day, at exactly 19:00
  if (hhmm !== '19:00' || lastCheck === dayKey) return;

  // Check if tomorrow is a workday (Mon=1 ... Fri=5)
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowDay = tomorrow.getDay(); // 0=Sun ... 6=Sat
  if (tomorrowDay === 0 || tomorrowDay === 6) return; // No notification on weekends

  lastCheck = dayKey;

  // Build notification message based on Firebase data
  const { title, body } = buildMessage(firebaseData, tomorrow);

  await self.registration.showNotification(title, {
    body,
    icon: './icon.png',
    badge: './icon.png',
    tag: 'daily-reminder',
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: { url: self.location.origin }
  });
}

function buildMessage(data, tomorrow) {
  // Get tomorrow's week key (Monday of that week) and day index
  const tDay = tomorrow.getDay(); // 1=Mon, 5=Fri
  const dayIndex = tDay - 1; // 0=Mon, 4=Fri
  const mon = new Date(tomorrow);
  mon.setDate(tomorrow.getDate() - tDay + 1);
  mon.setHours(0,0,0,0);
  const weekKey = mon.toISOString().slice(0,10);

  const DAYS_DE = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
  const dayName = DAYS_DE[dayIndex];

  const entry = data?.[weekKey]?.[dayIndex];

  if (!entry || (!entry.transport && !entry.cafeteria && (!entry.food || entry.food.length === 0))) {
    // Nothing filled in
    return {
      title: `⚠️ Schindlergooses – ${dayName}`,
      body: `Für morgen (${dayName}) ist noch nichts eingetragen. Bitte ausfüllen! 🪿`
    };
  }

  // Build summary
  let parts = [];
  if (entry.transport) {
    parts.push(`🚗 ${entry.transport}`);
  }
  if (entry.abfahrt) {
    parts.push(`⏰ Abfahrt: ${entry.abfahrt}`);
  }
  if (entry.cafeteria) {
    parts.push('🍽️ Cafeteria');
  }
  if (entry.food && entry.food.length > 0) {
    parts.push(`🥡 Mitgebracht: ${entry.food.length}×`);
  }
  if (entry.note) {
    parts.push(`📝 ${entry.note}`);
  }

  return {
    title: `🪿 Morgen – ${dayName}`,
    body: parts.join('\n')
  };
}

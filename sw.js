importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBtC4HBb01I5wFxi7b6wGrnWvRLoxZnGXc",
  authDomain: "schindlergooses.firebaseapp.com",
  databaseURL: "https://schindlergooses-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "schindlergooses",
  storageBucket: "schindlergooses.firebasestorage.app",
  messagingSenderId: "247916300788",
  appId: "1:247916300788:web:226174e1941e98e0d211a1"
});

const messaging = firebase.messaging();

// ── Schindlergooses Service Worker ──
// Handles push notifications from Firebase Cloud Messaging

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Handle push notifications from FCM
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

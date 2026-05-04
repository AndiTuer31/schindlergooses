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

// FCM übernimmt automatisch den Push-Handler
// KEIN eigener push-Listener — das war der Bug der alles blockiert hat
const messaging = firebase.messaging();

// Hintergrund-Nachrichten (App geschlossen/minimiert)
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Schindlergooses 🪿';
  const body  = payload.notification?.body  || '';
  self.registration.showNotification(title, {
    body,
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'daily-reminder',
    renotify: true,
    data: { url: 'https://AndiTuer31.github.io/schindlergooses/' }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow(e.notification.data?.url || 'https://AndiTuer31.github.io/schindlergooses/');
    })
  );
});

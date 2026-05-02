const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getDatabase } = require("firebase-admin/database");

initializeApp();

exports.dailyReminder = onSchedule({
  schedule: "00 17 * * 1-5",  // Täglich 19:00 Schweizer Zeit (17:00 UTC)
  timeZone: "Europe/Zurich",
}, async () => {
  const db = getDatabase();

  // Hole alle FCM Tokens
  const tokensSnap = await db.ref("fcmTokens").get();
  if (!tokensSnap.exists()) {
    console.log("Keine FCM Tokens gefunden.");
    return;
  }

  const tokens = Object.values(tokensSnap.val());

  // Bestimme morgen
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tDay = tomorrow.getDay();

  // Kein Push am Wochenende
  if (tDay === 0 || tDay === 6) {
    console.log("Morgen ist Wochenende – kein Push.");
    return;
  }

  const DAYS_DE = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag"];
  const dayName = DAYS_DE[tDay - 1];

  // Weekkey berechnen (Montag der Woche von morgen)
  const mon = new Date(tomorrow);
  mon.setDate(tomorrow.getDate() - tDay + 1);
  mon.setHours(0,0,0,0);
  const weekKey = mon.toISOString().slice(0,10);

  // Hole Daten für morgen aus Firebase
  const dataSnap = await db.ref(`weeks/${weekKey}/${tDay - 1}`).get();
  const entry = dataSnap.val();

  let title, body;
  if (!entry || (!entry.transport && !entry.cafeteria && (!entry.food || entry.food.length === 0))) {
    title = `⚠️ Schindlergooses – ${dayName}`;
    body  = `Für morgen (${dayName}) ist noch nichts eingetragen. Bitte ausfüllen! 🪿`;
  } else {
    const parts = [];
    if (entry.transport)       parts.push(`🚗 ${entry.transport}`);
    if (entry.abfahrt)         parts.push(`⏰ Abfahrt: ${entry.abfahrt}`);
    if (entry.cafeteria)       parts.push("🍽️ Cafeteria");
    if (entry.food?.length)    parts.push(`🥡 Mitgebracht: ${entry.food.length}×`);
    if (entry.note)            parts.push(`📝 ${entry.note}`);
    title = `🪿 Morgen – ${dayName}`;
    body  = parts.join("\n");
  }

  // Sende Push an alle Tokens
  const messages = tokens.map(token => ({
    token,
    notification: { title, body },
    webpush: {
      notification: {
        icon: "https://AndiTuer31.github.io/schindlergooses/icon.png",
        badge: "https://AndiTuer31.github.io/schindlergooses/icon.png",
        requireInteraction: true,
        tag: "daily-reminder",
        renotify: true,
        vibrate: [200, 100, 200]
      },
      fcmOptions: {
        link: "https://AndiTuer31.github.io/schindlergooses/"
      }
    }
  }));

  const result = await getMessaging().sendEach(messages);
  console.log(`Push gesendet: ${result.successCount} erfolgreich, ${result.failureCount} fehlgeschlagen.`);
});

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "gen-lang-client-0592504740",
  appId: "1:438859432767:web:5778b18c152a712088498a",
  apiKey: "AIzaSyCjgnOJfuUuI_kuWyRXawThnRfadi2trKk",
  authDomain: "gen-lang-client-0592504740.firebaseapp.com",
  storageBucket: "gen-lang-client-0592504740.firebasestorage.app",
  messagingSenderId: "438859432767"
};

firebase.initializeApp(firebaseConfig);

try {
  if (firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Background message: ', payload);
      const notificationTitle = payload.notification?.title || 'Nova Doação PIX Recebida!';
      const notificationOptions = {
        body: payload.notification?.body || 'Uma nova doação PIX foi registrada na sua rede Direct Cash.',
        icon: '/icon.png',
        data: payload.data
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (e) {
  console.log('Firebase messaging service worker init error:', e);
}

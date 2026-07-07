importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')
// // Initialize the Firebase app in the service worker by passing the generated config 

const firebaseConfig = {
  apiKey: "AIzaSyBftlv1HuLggCHOTzwGlFkC12EuwhKnFXc",
  authDomain: "smsget-591c8.firebaseapp.com",
  projectId: "smsget-591c8",
  storageBucket: "smsget-591c8.appspot.com",
  messagingSenderId: "945646597828",
  appId: "1:945646597828:web:567a181344be6e50a63b91",
  measurementId: "G-5NHMRGDZDC"
};

firebase?.initializeApp(firebaseConfig)


// Retrieve firebase messaging
const messaging = firebase.messaging();

self.addEventListener('install', function (event) {
  // console.log('Hello world from the Service Worker :call_me_hand:');
});

// Handle background messages
self.addEventListener('push', function (event) {
  const payload = event.data.json();
  // console.log('Push event received:', payload);
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.title,
    icon: payload.data.image ? payload.data.image : null,
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});
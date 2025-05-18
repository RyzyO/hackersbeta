// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
        apiKey: "AIzaSyAYat6m3-Lv46vfm6xcHLjTjRDq7NdCxAk",
        authDomain: "hackers-cup.firebaseapp.com",
        databaseURL: "https://hackers-cup-default-rtdb.firebaseio.com",
        projectId: "hackers-cup",
        storageBucket: "hackers-cup.appspot.com",
        messagingSenderId: "765736070872",
        appId: "1:765736070872:web:86a51c41916e7af75631ad",
        measurementId: "G-6E1M14F510"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/favicon.png'
  });
});

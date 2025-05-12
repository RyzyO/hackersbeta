// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js');

// Initialize Firebase
const firebaseConfig = {
            apiKey: "AIzaSyAYat6m3-Lv46vfm6xcHLjTjRDq7NdCxAk",
            authDomain: "hackers-cup.firebaseapp.com",
            databaseURL: "https://hackers-cup-default-rtdb.firebaseio.com",
            projectId: "hackers-cup",
            storageBucket: "hackers-cup.appspot.com",
            messagingSenderId: "765736070872",
            appId: "1:765736070872:web:86a51c41916e7af75631ad",
            measurementId: "G-6E1M14F510"
        };

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = 'Background Message Title';
    const notificationOptions = {
        body: 'Background message body.',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

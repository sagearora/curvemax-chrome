
self.importScripts('firebase/firebase-app.js', 'firebase/firebase-auth.js', 'firebase/firebase-firestore.js');

const firebaseConfig = {
    apiKey: "AIzaSyBCmJfvvX6xfSpUsppIrE-qUP-qXGUqtL8",
    authDomain: "flosspass-app.firebaseapp.com",
    projectId: "flosspass-app",
    storageBucket: "flosspass-app.appspot.com",
    messagingSenderId: "147805861787",
    appId: "1:147805861787:web:a6d9fe7d582c55a698133e",
    measurementId: "G-YB3DFGN7KP"
};

firebase.initializeApp(firebaseConfig);

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBPqKq4jQA5KLtRZ9Ril1Ia8XGatdjJafI",
    authDomain: "together-b3eff.firebaseapp.com",
    projectId: "together-b3eff",
    storageBucket: "together-b3eff.appspot.com",
    messagingSenderId: "535453150266",
    appId: "1:535453150266:web:7661d7d784317bda315903",
    measurementId: "G-XJFNMD5652"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

// Ensure auth state is loaded before using currentUser
onAuthStateChanged(auth, (user) => {
    if (!user && window.location.pathname !== "/index.html") {
        window.location.href = "index.html"; // Redirect unauthenticated users
    }
});

// Authentication Functions
export function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    signInWithEmailAndPassword(auth, email, password)
        .then(() => alert("Login successful!"))
        .catch(error => alert(error.message));
}

export function signup() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    createUserWithEmailAndPassword(auth, email, password)
        .then(() => alert("Signup successful!"))
        .catch(error => alert(error.message));
}

export function logout() {
    signOut(auth).then(() => window.location.href = "index.html");
}

// Contacts Functions
export async function addContact(email) {
    try {
        const user = auth.currentUser;
        if (!user) return alert("Please log in first.");

        await addDoc(collection(db, "contacts"), { user: user.email, contact: email });
        alert("Contact added!");
    } catch (error) {
        alert(error.message);
    }
}

export function loadContacts() {
    onAuthStateChanged(auth, (user) => {
        if (!user) return;

        const contactsList = document.getElementById("contacts-list");
        contactsList.innerHTML = "";

        const q = query(collection(db, "contacts"), where("user", "==", user.email));
        onSnapshot(q, (querySnapshot) => {  // Real-time updates
            contactsList.innerHTML = "";  // Clear old contacts
            querySnapshot.forEach(doc => {
                const li = document.createElement("li");
                li.textContent = doc.data().contact;
                li.addEventListener("click", () => {
                    window.location.href = `chat.html?contact=${encodeURIComponent(doc.data().contact)}`;
                });
                contactsList.appendChild(li);
            });
        });
    });
}

// Chat Functions
export async function sendMessage(contactEmail, message) {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");
    
    await addDoc(collection(db, "messages"), { sender: user.email, receiver: contactEmail, message, timestamp: Date.now() });
}

export function loadMessages(contactEmail) {
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "Loading messages...";
    
    const q = query(collection(db, "messages"), 
        where("sender", "in", [auth.currentUser.email, contactEmail]),
        where("receiver", "in", [auth.currentUser.email, contactEmail])
    );

    onSnapshot(q, (querySnapshot) => {
        messagesDiv.innerHTML = "";
        querySnapshot.forEach(doc => {
            const p = document.createElement("p");
            p.textContent = `${doc.data().sender}: ${doc.data().message}`;
            messagesDiv.appendChild(p);
        });
    });
}

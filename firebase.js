import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

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

export async function loadContacts() {
    const user = auth.currentUser;
    if (!user) return;

    const contactsList = document.getElementById("contacts-list");
    contactsList.innerHTML = "";
    const q = query(collection(db, "contacts"), where("user", "==", user.email));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(doc => {
        const li = document.createElement("li");
        li.textContent = doc.data().contact;
        li.addEventListener("click", () => window.location.href = "chat.html");
        contactsList.appendChild(li);
    });
}

// Chat Functions
export async function sendMessage(message) {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");
    
    await addDoc(collection(db, "messages"), { user: user.email, message, timestamp: Date.now() });
}

export async function loadMessages() {
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "Loading messages...";
    
    const querySnapshot = await getDocs(collection(db, "messages"));
    messagesDiv.innerHTML = "";
    querySnapshot.forEach(doc => {
        const p = document.createElement("p");
        p.textContent = doc.data().user + ": " + doc.data().message;
        messagesDiv.appendChild(p);
    });
}

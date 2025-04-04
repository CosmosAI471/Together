
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, onSnapshot, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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
export const db = getFirestore(app);

// Auth Functions
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

// Contacts
export async function addContact(email) {
    const user = auth.currentUser;
    if (!user) return alert("Login first.");
    await addDoc(collection(db, "contacts"), { user: user.email, contact: email });
    alert("Contact added!");
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
        li.addEventListener("click", () => {
            sessionStorage.setItem("chatWith", doc.data().contact);
            window.location.href = "chat.html";
        });
        contactsList.appendChild(li);
    });
}

// Chat
export async function sendMessage(receiverEmail, message) {
    const user = auth.currentUser;
    if (!user) return alert("Login first.");
    await addDoc(collection(db, "messages"), {
        sender: user.email,
        receiver: receiverEmail,
        message,
        timestamp: Date.now()
    });
}

export async function loadMessages(contactEmail) {
    const user = auth.currentUser;
    if (!user || !contactEmail) return;
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "Loading messages...";
    const q = query(collection(db, "messages"));
    const querySnapshot = await getDocs(q);
    messagesDiv.innerHTML = "";
    querySnapshot.forEach(doc => {
        const data = doc.data();
        if (
            (data.sender === user.email && data.receiver === contactEmail) ||
            (data.sender === contactEmail && data.receiver === user.email)
        ) {
            const p = document.createElement("p");
            p.textContent = `${data.sender}: ${data.message}`;
            messagesDiv.appendChild(p);
        }
    });
}

// Voice Call Signal Functions
export async function startCall(targetEmail, offer) {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, "calls", targetEmail), {
        from: user.email,
        offer
    });
}

export function listenForIncomingCall(onCall) {
    const user = auth.currentUser;
    if (!user) return;
    return onSnapshot(doc(db, "calls", user.email), snapshot => {
        if (snapshot.exists()) {
            onCall(snapshot.data(), snapshot.ref);
        }
    });
}

export async function endCall(email) {
    await deleteDoc(doc(db, "calls", email));
}

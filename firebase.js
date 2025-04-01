import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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

// ✅ Send message with sender & receiver info
export async function sendMessage(receiver, message) {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");
    
    await addDoc(collection(db, "messages"), {
        sender: user.email,
        receiver: receiver,
        message: message,
        timestamp: Date.now()
    });
}

// ✅ Load messages in real-time (sender ↔ receiver)
export async function loadMessages(receiver) {
    const user = auth.currentUser;
    if (!user) return;

    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "Loading messages...";

    const q = query(
        collection(db, "messages"),
        where("sender", "in", [user.email, receiver]), // Messages sent or received
        where("receiver", "in", [user.email, receiver]), // Messages sent or received
        orderBy("timestamp", "asc") // Oldest messages first
    );

    onSnapshot(q, (querySnapshot) => {
        messagesDiv.innerHTML = ""; // Clear messages before updating
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const p = document.createElement("p");
            p.textContent = `${data.sender}: ${data.message}`;
            messagesDiv.appendChild(p);
        });
    });
}

// ✅ Add contacts
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

// ✅ Load contacts correctly
export async function loadContacts() {
    const user = auth.currentUser;
    if (!user) return;

    const contactsList = document.getElementById("contacts-list");
    contactsList.innerHTML = "";
    const q = query(collection(db, "contacts"), where("user", "==", user.email));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(doc => {
        const li = document.createElement("li");
        const contactEmail = doc.data().contact;
        li.textContent = contactEmail;
        li.addEventListener("click", () => {
            window.location.href = `chat.html?contact=${encodeURIComponent(contactEmail)}`;
        });
        contactsList.appendChild(li);
    });
}

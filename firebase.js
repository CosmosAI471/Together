import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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
        li.addEventListener("click", () => {
            sessionStorage.setItem("chatWith", doc.data().contact);
            window.location.href = "chat.html";
        });
        contactsList.appendChild(li);
    });
}

// Chat Functions (Private Messaging)
export async function sendMessage(receiverEmail, message) {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

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
        // Show only messages between the two users
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

// **Voice Call Functions**
export async function startCall(contactEmail) {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    const callRef = doc(db, "calls", contactEmail);
    await setDoc(callRef, { caller: user.email, status: "ringing" });
}

export function listenForCalls() {
    const user = auth.currentUser;
    if (!user) return;

    const callRef = doc(db, "calls", user.email);
    onSnapshot(callRef, (snapshot) => {
        const callData = snapshot.data();
        if (callData && callData.status === "ringing") {
            const accept = confirm(`Incoming call from ${callData.caller}. Accept?`);
            if (accept) {
                acceptCall(callData.caller);
            } else {
                declineCall(user.email);
            }
        }
    });
}

export async function acceptCall(callerEmail) {
    const user = auth.currentUser;
    if (!user) return;

    const callRef = doc(db, "calls", user.email);
    await setDoc(callRef, { caller: callerEmail, status: "accepted" });
    alert("Call accepted! (Now integrate WebRTC)");
}

export async function declineCall(userEmail) {
    const callRef = doc(db, "calls", userEmail);
    await deleteDoc(callRef);
    alert("Call declined.");
}

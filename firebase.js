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
// WebRTC Variables
let peerConnection;
const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Start Call (User A)
export async function startCall(contactEmail) {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");
    
    peerConnection = new RTCPeerConnection(servers);
    setupWebRTC(peerConnection, user.email, contactEmail);
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    const callRef = doc(db, "calls", contactEmail);
    await setDoc(callRef, { caller: user.email, offer: offer });
}

// Listen for Calls (User B)
export function listenForCalls() {
    const user = auth.currentUser;
    if (!user) return;
    
    const callRef = doc(db, "calls", user.email);
    onSnapshot(callRef, async (snapshot) => {
        const callData = snapshot.data();
        if (callData?.offer) {
            const accept = confirm(`Incoming call from ${callData.caller}. Accept?`);
            if (accept) {
                acceptCall(callData.caller, callData.offer);
            } else {
                declineCall(user.email);
            }
        }
    });
}

// Accept Call (User B)
async function acceptCall(callerEmail, offer) {
    const user = auth.currentUser;
    if (!user) return;

    peerConnection = new RTCPeerConnection(servers);
    setupWebRTC(peerConnection, user.email, callerEmail);

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    const callRef = doc(db, "calls", user.email);
    await setDoc(callRef, { caller: callerEmail, answer: answer });

    alert("Call accepted!");
}

// Listen for Answer (User A)
export function listenForAnswer(contactEmail) {
    const callRef = doc(db, "calls", contactEmail);
    onSnapshot(callRef, async (snapshot) => {
        const callData = snapshot.data();
        if (callData?.answer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.answer));
        }
    });
}

// Setup WebRTC
function setupWebRTC(peer, localUser, remoteUser) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peer.ontrack = (event) => {
            const remoteAudio = document.getElementById("remote-audio");
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play();
        };
    });

    peer.onicecandidate = (event) => {
        if (event.candidate) {
            const candidateRef = doc(db, "iceCandidates", remoteUser);
            setDoc(candidateRef, { candidate: event.candidate });
        }
    };

    const candidateRef = doc(db, "iceCandidates", localUser);
    onSnapshot(candidateRef, async (snapshot) => {
        const data = snapshot.data();
        if (data?.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });
}

// Decline or Hang Up Call
export async function declineCall(userEmail) {
    await deleteDoc(doc(db, "calls", userEmail));
    alert("Call declined.");
}

export async function hangUp() {
    peerConnection.close();
    peerConnection = null;
    const user = auth.currentUser;
    if (user) await deleteDoc(doc(db, "calls", user.email));
    alert("Call ended.");
}

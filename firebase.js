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

// Chat Functions
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

// **WebRTC Voice Call Functions**
let peerConnection;
const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let localStream;

export async function startCall(contactEmail) {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    peerConnection = new RTCPeerConnection(servers);
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            addDoc(collection(db, "calls"), { caller: user.email, receiver: contactEmail, ice: event.candidate });
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await setDoc(doc(db, "calls", contactEmail), { caller: user.email, offer });

    document.getElementById("end-call-btn").style.display = "block";
}

export function listenForCalls() {
    const user = auth.currentUser;
    if (!user) return;

    onSnapshot(doc(db, "calls", user.email), async snapshot => {
        const callData = snapshot.data();
        if (!callData) return;

        if (callData.offer) {
            const accept = confirm(`Incoming call from ${callData.caller}. Accept?`);
            if (accept) {
                peerConnection = new RTCPeerConnection(servers);
                const remoteStream = new MediaStream();
                peerConnection.ontrack = event => remoteStream.addTrack(event.track);

                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

                peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                await setDoc(doc(db, "calls", callData.caller), { answer });

                document.getElementById("end-call-btn").style.display = "block";
            }
        }
        if (callData.answer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.answer));
        }
    });
}

export function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    document.getElementById("end-call-btn").style.display = "none";
}

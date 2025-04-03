import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, deleteDoc, collection, addDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBPqKq4jQA5KLtRZ9Ril1Ia8XGatdjJafI",
    authDomain: "together-b3eff.firebaseapp.com",
    projectId: "together-b3eff",
    storageBucket: "together-b3eff.appspot.com",
    messagingSenderId: "535453150266",
    appId: "1:535453150266:web:7661d7d784317bda315903"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export async function sendMessage(contactEmail, message) {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");

    const chatRef = collection(db, "messages");
    await addDoc(chatRef, {
        sender: user.email,
        receiver: contactEmail,
        message: message,
        timestamp: new Date()
    });
}

export function loadMessages(contactEmail) {
    const user = auth.currentUser;
    if (!user) return;

    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, orderBy("timestamp"));

    onSnapshot(q, (snapshot) => {
        let messagesHTML = "";
        snapshot.forEach((doc) => {
            const data = doc.data();
            if ((data.sender === user.email && data.receiver === contactEmail) ||
                (data.sender === contactEmail && data.receiver === user.email)) {
                messagesHTML += `<p><b>${data.sender}:</b> ${data.message}</p>`;
            }
        });
        document.getElementById("messages").innerHTML = messagesHTML;
    });
}

export function logout() {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch((error) => {
        alert("Error logging out: " + error.message);
    });
}

// WebRTC Call Functions
let peerConnection;
let localStream;

const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export async function startCall(contactEmail) {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    alert(`Calling ${contactEmail}...`);

    peerConnection = new RTCPeerConnection(servers);
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            setDoc(doc(db, "calls", contactEmail), { caller: user.email, ice: event.candidate });
        }
    };

    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
            alert("Call connected!");
            document.getElementById("end-call-btn").style.display = "block";
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await setDoc(doc(db, "calls", contactEmail), { caller: user.email, offer });

    alert("Call request sent to User B!");
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

                alert("Call accepted! Connecting...");
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
    const user = auth.currentUser;
    if (user) {
        deleteDoc(doc(db, "calls", user.email));
    }
    alert("Call ended!");
    document.getElementById("end-call-btn").style.display = "none";
}

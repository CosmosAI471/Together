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

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

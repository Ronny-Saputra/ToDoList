document.addEventListener('DOMContentLoaded', function() {
    const app = firebase.app();
    const db = firebase.firestore();
    console.log("Firebase App initialized:", app);
    console.log("Firestore DB instance:", db);
});

function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log("User signed in:", user);
            alert(`Welcome, ${user.displayName}`);
        })
        .catch((error) => {
            console.error("Error during sign-in:", error);
            alert(`Error: ${error.message}`);
        });
}



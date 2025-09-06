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
function facebookLogin() {
    const provider = new firebase.auth.FacebookAuthProvider();
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

function emailLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("User signed in:", user);
            alert(`Welcome, ${user.email}`);
        })
        .catch((error) => {
            console.error("Error during sign-in:", error);
            alert(`Error: ${error.message}`);
        });
    return false; // Prevent form submission
}

function emailSignup(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("User signed up:", user);
            alert(`Account created for ${user.email}`);
        })
        .catch((error) => {
            console.error("Error during sign-up:", error);
            alert(`Error: ${error.message}`);
        });
    return false; // Prevent form submission
}



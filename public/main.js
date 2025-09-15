document.addEventListener('DOMContentLoaded', function() {
    const splash = document.querySelector(".splash-container");
    splash.classList.add("fade-out"); 
    setTimeout(() => {
        window.location.href = "pages/login.html";
    }, 3000);

    const app = firebase.app();
    const db = firebase.firestore();
    console.log("Firebase App initialized:", app);
    console.log("Firestore DB instance:", db);
});

document.querySelectorAll(".task-card").forEach(card => {
      card.addEventListener("click", () => {
        // hapus active dari semua card
        document.querySelectorAll(".task-card").forEach(c => c.classList.remove("active"));
        // kasih active ke card yang diklik
        card.classList.add("active");
      });
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

function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  if (isMobile()) {
    console.log("Mobile");
    document.body.classList.add("mobile");
  } else {
    console.log("Desktop");
    document.body.classList.add("desktop");
  }


  
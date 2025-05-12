
   
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
        import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
        import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

        const firebaseConfig = {
            apiKey: "AIzaSyAYat6m3-Lv46vfm6xcHLjTjRDq7NdCxAk",
            authDomain: "hackers-cup.firebaseapp.com",
            databaseURL: "https://hackers-cup-default-rtdb.firebaseio.com",
            projectId: "hackers-cup",
            storageBucket: "hackers-cup.appspot.com",
            messagingSenderId: "765736070872",
            appId: "1:765736070872:web:86a51c41916e7af75631ad",
            measurementId: "G-6E1M14F510"
        };

        const app = initializeApp(firebaseConfig);
        const analytics = getAnalytics(app);
        const database = getDatabase();

        const auth = getAuth(app);


       function getDisplayName(user) {
    const userRef = ref(database, `users/${user.uid}/displayName`);
    onValue(userRef, (snapshot) => {
        const displayName = snapshot.val();
        if (displayName) {
            document.getElementById('user-name').textContent = displayName;
        } else {
            const name = prompt('Please enter your display name:');
            if (name && name.trim() !== '') {
                set(userRef, name.trim())
                    .then(() => {
                        document.getElementById('user-name').textContent = name.trim();
                    })
                    .catch((error) => {
                        console.error('Error updating display name:', error);
                    });
            }
        }
    });
}

function getHackerNumber(user) {
    const hackerRef = ref(database, `users/${user.uid}/hackerNumber`);
    onValue(hackerRef, (snapshot) => {
        const hackerNumber = snapshot.val();
        if (hackerNumber) {
            document.getElementById('hacker-number').textContent = '  ' + hackerNumber + '';
        } else {
            document.getElementById('hacker-number').textContent = ' (Hackers number not assigned yet)';
        }
    });
}


auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        getDisplayName(user);
        getHackerNumber(user);
    }
});


        function leave() {
            auth.signOut()
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error('Sign Out Error', error);
                });
        }

        

        function toggleSettingsPanel() {
            const settingsPanel = document.getElementById('settings-panel');
            settingsPanel.classList.toggle('show');
        }

        function updateCountdown() {
            const targetDate = new Date("August 23, 2024 11:00:00 GMT+1000");
            const currentDate = new Date();
            const timeDifference = targetDate - currentDate;

            if (timeDifference < 0) {
                document.getElementById('countdown').textContent = 'Hackers Cup has begun!';
                return;
            }

            const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

            document.getElementById('days').textContent = padZeroes(days);
            document.getElementById('hours').textContent = padZeroes(hours);
            document.getElementById('minutes').textContent = padZeroes(minutes);
            document.getElementById('seconds').textContent = padZeroes(seconds);
        }

        // Function to add leading zeroes to numbers less than 10
        function padZeroes(num) {
            return num < 10 ? '0' + num : num;
        }

        // Initial call to update the countdown timer
        updateCountdown();

        // Call the updateCountdown function every second
        setInterval(updateCountdown, 1000);
    </script>
    <script>
        function toggleSettingsPanel() {
            const settingsPanel = document.getElementById('settings-panel');
            settingsPanel.classList.toggle('show');
        }
    </script>
    <script>
       function changeWallpaper(option) {
    var backgroundImageUrl = "10th.jpg";

    if (option === "none") {
        backgroundImageUrl = "10th.jpg"; // Update with the correct image URL
        document.getElementById('header').classList.remove('light-text');
        document.getElementById('countdown').classList.remove('light-text');
        document.getElementById('header').classList.add('dark-text');
        document.getElementById('countdown').classList.add('dark-text');
    } else {
        if (option === "golf1") {
           
        } else if (option === "golf2") {
            backgroundImageUrl = "kiama.jpg"; // Update with the correct image URL
        } else if (option === "golf3") {
            backgroundImageUrl = "greenwell.jpg"; // Update with the correct image URL
        }
		  document.addEventListener('DOMContentLoaded', function() {
        var wallpaper = document.getElementById('wallpaper');
        wallpaper.style.backgroundImage = "url('10th.jpg')"; // Default wallpaper URL
        
        // Apply background image to wallpaper element
        document.getElementById('wallpaper').style.backgroundImage = "url('" + backgroundImageUrl + "')";

        // Remove dark-text class and add light-text class
        document.getElementById('details').classList.remove('dark-text');
        document.getElementById('countdown').classList.remove('dark-text');
        document.getElementById('details').classList.add('light-text');
        document.getElementById('countdown').classList.add('light-text');
    }

    toggleSettingsPanel(); // Close settings panel after selection
}

    
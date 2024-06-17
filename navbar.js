// navbar.js
document.addEventListener("DOMContentLoaded", function() {
    fetch("navbar.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("navbar").innerHTML = data;
        });

    // Function to toggle the more panel
    window.toggleMorePanel = function() {
        var morePanel = document.getElementById('more-panel');
        morePanel.classList.toggle('show');
    };
});

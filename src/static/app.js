document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: escape HTML to avoid XSS when rendering participant names/emails
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
    );
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (bulleted list or empty state)
        const participants = details.participants || [];
        let participantsHtml = "";
        if (participants.length === 0) {
          participantsHtml = '<p class="empty">No participants yet</p>';
        } else {
          participantsHtml =
            '<ul class="participants-list">' +
            participants
              .map(
                (p) =>
                  `<li><span class="participant-email">${escapeHtml(p)}</span><button class="delete-btn" data-activity="${escapeHtml(
                    name
                  )}" data-email="${escapeHtml(p)}" aria-label="Remove participant">&times;</button></li>`
              )
              .join("") +
            "</ul>";
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants">
            <h5>Participants</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Unregister participant helper
  async function unregisterParticipant(activity, email) {
    try {
      const url = `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`;
      const response = await fetch(url, { method: "DELETE" });
      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        messageDiv.classList.remove("hidden");

        // Refresh activities to reflect change
        await fetchActivities();

        setTimeout(() => messageDiv.classList.add("hidden"), 3000);
      } else {
        messageDiv.textContent = result.detail || "Failed to unregister participant";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
      }
    } catch (err) {
      console.error("Error unregistering participant:", err);
      messageDiv.textContent = "Failed to unregister participant";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
    }
  }

  // Event delegation for delete buttons
  activitiesList.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;
    const activityName = btn.dataset.activity;
    const email = btn.dataset.email;

    if (!activityName || !email) return;

    // Confirm before deleting
    if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

    unregisterParticipant(activityName, email);
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

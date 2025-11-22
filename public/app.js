const API_BASE = "/api/links";

// Load links from backend
async function loadLinks() {
  const container = document.getElementById("recent-links-cards");
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Failed to fetch links");
    const links = await res.json();

    if (!links.length) {
      container.innerHTML = "<p>No links yet.</p>";
      return;
    }

    // Render each link
    container.innerHTML = links.map(link => {
      const shortUrl = `${window.location.origin}/${link.short_code}`;
      return `
        <div class="link-row">
          <span class="short-code">${link.short_code}</span>
          <span class="long-url" title="${link.original_url}">${link.original_url}</span>
          <div class="link-actions">
            <button class="copy-btn" data-url="${shortUrl}"><i class="fas fa-copy"></i> Copy</button>
            <a href="${link.original_url}" target="_blank" class="visit-btn">Visit</a>
          </div>
        </div>
      `;
    }).join("");

    // Add copy functionality
    document.querySelectorAll(".copy-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const url = btn.getAttribute("data-url");
        navigator.clipboard.writeText(url)
          .then(() => {
            btn.innerText = "Copied!";
            setTimeout(() => btn.innerHTML = `<i class="fas fa-copy"></i> Copy`, 1500);
          })
          .catch(err => console.error(err));
      });
    });

  } catch (err) {
    container.innerHTML = "<p>Failed to load links</p>";
    console.error(err);
  }
}

// Handle form submission to shorten URL
document.getElementById("link-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const original_url = document.getElementById("original_url").value;
  const custom_code = document.getElementById("custom_code").value;

  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ original_url, custom_code })
    });

    if (!res.ok) throw new Error("Failed to shorten link");
    document.getElementById("original_url").value = "";
    document.getElementById("custom_code").value = "";
    
    // Reload links
    loadLinks();
  } catch (err) {
    alert("Error creating short link");
    console.error(err);
  }
});

// Load links on page load
document.addEventListener("DOMContentLoaded", loadLinks);

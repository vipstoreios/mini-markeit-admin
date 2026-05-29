/* Mini markeit Admin - user profiles loader */
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    window.loadUserProfiles = loadUserProfiles;
  });

  async function loadUserProfiles() {
    const table = document.getElementById("usersTable");
    const notice = document.getElementById("usersNotice");

    if (!table) return;

    table.innerHTML = `<tr><td colspan="8" class="empty">چاوەڕێ بکە...</td></tr>`;
    setNotice(notice, "", true);

    try {
      if (typeof sb === "undefined" || !sb) {
        table.innerHTML = `<tr><td colspan="8" class="empty">Supabase client ئامادە نییە</td></tr>`;
        return;
      }

      const { data, error } = await sb
        .from("user_profiles")
        .select("id, phone, name, email, provider, is_online, last_seen, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        table.innerHTML = `<tr><td colspan="8" class="empty">هەڵە لە هێنانی هەژماران</td></tr>`;
        setNotice(notice, `خشتەی user_profiles هێشتا ئامادە نییە یان ڕێگەپێدان نییە: ${escapeHtml(error.message)}`, false);
        return;
      }

      renderUsers(data || []);
    } catch (error) {
      table.innerHTML = `<tr><td colspan="8" class="empty">هەڵەیەک ڕوویدا</td></tr>`;
      setNotice(notice, escapeHtml(String(error)), false);
    }
  }

  function renderUsers(users) {
    const table = document.getElementById("usersTable");
    if (!table) return;

    if (!users.length) {
      table.innerHTML = `<tr><td colspan="8" class="empty">هێشتا هیچ بەکارهێنەرێک تۆمار نەبووە</td></tr>`;
      return;
    }

    table.innerHTML = users
      .map((user) => {
        const online = user.is_online === true;
        const provider = user.provider || "sms";

        return `
          <tr>
            <td><b>${escapeHtml(user.name || "کڕیار")}</b><small>ID: ${escapeHtml(shortId(user.id))}</small></td>
            <td>${escapeHtml(user.email || "-")}</td>
            <td><b>${escapeHtml(formatPhone(user.phone))}</b></td>
            <td>${escapeHtml(provider.toUpperCase())}</td>
            <td><span class="badge ${online ? "done" : "off"}">${online ? "Online" : "Offline"}</span></td>
            <td>${escapeHtml(formatDate(user.created_at))}</td>
            <td>${escapeHtml(formatDate(user.last_seen || user.updated_at))}</td>
            <td><span class="badge off">پارێزراوە</span></td>
          </tr>
        `;
      })
      .join("");
  }

  function setNotice(notice, message, hidden) {
    if (!notice) return;
    notice.innerHTML = message;
    notice.classList.toggle("hidden", hidden || !message);
  }

  function shortId(id) {
    return String(id || "-").slice(0, 8);
  }

  function formatPhone(phone) {
    const value = String(phone || "").replace(/^\+/, "");
    if (value.startsWith("964")) return `+${value}`;
    return value || "-";
  }

  function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-US");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();

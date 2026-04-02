/* ============================================================
   REFUND AI — DASHBOARD SCRIPT (Final Fix)
   - Parses refunds from data.data OR data.message (JSON string)
   - Side panel: Pending + History (approved/rejected)
   - Smooth animations, state-driven, no re-render bugs
   ============================================================ */

"use strict";

const API_BASE = "http://localhost:8000";

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  refunds: [], // { id, from, course, price, orderId, status, subject, snippet, date }
};

// ─── State Helpers ────────────────────────────────────────────────────────────
function mergeRefunds(incoming) {
  incoming.forEach((item) => {
    const exists = state.refunds.find((r) => r.id === item.id);
    if (!exists) {
      state.refunds.push({ ...item, status: item.status || "pending" });
    }
  });
}

function updateRefundStatus(id, status) {
  const refund = state.refunds.find((r) => r.id === id);
  if (refund) refund.status = status;
}

// ─── Parse server response — handles BOTH formats ─────────────────────────────
// Format 1: data.data = [...]
// Format 2: data.message contains raw JSON string with emails array
function extractRefundsFromResponse(data) {
  if (Array.isArray(data.data) && data.data.length > 0) return data.data;

  if (typeof data.message === "string") {
    try {
      const match = data.message.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed.emails)) return parsed.emails;
      }
    } catch (e) { /* not JSON */ }
  }

  return [];
}

// ─── API Layer ────────────────────────────────────────────────────────────────
async function apiSendMessage(message) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiSendDecision(decision, id) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "", decision, id }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Chat UI ──────────────────────────────────────────────────────────────────
function addChatMessage(text, role = "ai") {
  const messagesEl = document.getElementById("messages");

  const row = document.createElement("div");
  row.className = `message ${role === "user" ? "user-message" : "ai-message"} animate-in`;

  const avatar = document.createElement("div");
  avatar.className = `message-avatar ${role === "user" ? "user-avatar" : "ai-avatar"}`;
  avatar.textContent = role === "user" ? "You" : "AI";

  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${role === "user" ? "user-bubble" : "ai-bubble"}`;

  const p = document.createElement("p");
  p.textContent = text;

  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = getTimeString();

  bubble.appendChild(p);
  bubble.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollToBottom();
}

function setTyping(show) {
  const el = document.getElementById("typingIndicator");
  if (!el) return;
  el.style.display = show ? "flex" : "none";
  if (show) scrollToBottom();
}

// ─── Pending Refund Card ──────────────────────────────────────────────────────
function createRefundCard(refund) {
  const card = document.createElement("div");
  card.className = "refund-card animate-in";
  card.dataset.id = refund.id;

  const initials = (refund.from || "??").split("@")[0].substring(0, 2).toUpperCase();
  const subject = refund.subject || refund.snippet || "Refund Request";

  card.innerHTML = `
    <div class="card-header">
      <div class="card-user">
        <div class="user-initials">${initials}</div>
        <div>
          <div class="user-email">${escapeHtml(refund.from)}</div>
          <div class="user-subject">${escapeHtml(subject)}</div>
        </div>
      </div>
      <span class="status-badge badge-pending">Pending</span>
    </div>
    <div class="card-body">
      <p class="card-row"><span class="card-label">Course</span><span>${escapeHtml(refund.course || "—")}</span></p>
      <p class="card-row"><span class="card-label">Price</span><span>$${escapeHtml(String(refund.price || 0))}</span></p>
      <p class="card-row"><span class="card-label">Order</span><span>${escapeHtml(refund.orderId || "—")}</span></p>
      ${refund.date ? `<p class="card-row"><span class="card-label">Date</span><span>${escapeHtml(refund.date)}</span></p>` : ""}
    </div>
    <div class="card-actions">
      <button class="card-btn card-btn-approve" data-action="approve" data-id="${refund.id}">✓ Approve</button>
      <button class="card-btn card-btn-reject"  data-action="reject"  data-id="${refund.id}">✕ Reject</button>
    </div>
    <div class="card-meta">
      <span>${escapeHtml(refund.orderId || "ID: " + refund.id)}</span>
      <span>${getTimeString()}</span>
    </div>
  `;

  card.querySelectorAll(".card-btn").forEach((btn) => {
    btn.addEventListener("click", handleCardDecision);
  });

  return card;
}

// ─── History Card ─────────────────────────────────────────────────────────────
function createHistoryCard(refund) {
  const card = document.createElement("div");
  const isApproved = refund.status === "approved";
  card.className = `history-card history-card-${refund.status} animate-in`;
  card.dataset.id = refund.id;

  const initials = (refund.from || "??").split("@")[0].substring(0, 2).toUpperCase();
  const icon = isApproved ? "✓" : "✕";

  card.innerHTML = `
    <div class="history-icon history-icon-${refund.status}">${icon}</div>
    <div class="history-info">
      <div class="history-email">${escapeHtml(refund.from)}</div>
      <div class="history-detail">${escapeHtml(refund.course || "—")} · $${escapeHtml(String(refund.price || 0))}</div>
    </div>
    <span class="status-badge badge-${refund.status}">${isApproved ? "Approved" : "Rejected"}</span>
  `;

  return card;
}

// ─── Card Decision ────────────────────────────────────────────────────────────
async function handleCardDecision(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  const pendingList = document.getElementById("pendingList");
  const card = pendingList.querySelector(`[data-id="${id}"]`);
  if (!card) return;

  card.querySelectorAll(".card-btn").forEach((b) => (b.disabled = true));
  const originalText = btn.textContent;
  btn.innerHTML = `<span class="btn-spinner"></span>Processing…`;

  try {
    const data = await apiSendDecision(action, id);
    const newStatus = action === "approve" ? "approved" : "rejected";
    updateRefundStatus(id, newStatus);

    removeCardWithAnimation(card, () => {
      renderPendingRefunds();
      renderHistoryPanel();
    });

    updatePendingCount();

    const refund = state.refunds.find((r) => r.id === id);
    const emoji = newStatus === "approved" ? "✅" : "❌";
    const msg =
      data?.message && !data.message.includes("Tool execution")
        ? data.message
        : `${emoji} Refund for ${refund?.from || id} has been ${newStatus}.`;
    addChatMessage(msg, "ai");

  } catch {
    addChatMessage("❌ Failed to process. Please try again.", "ai");
    card.querySelectorAll(".card-btn").forEach((b) => (b.disabled = false));
    btn.textContent = originalText;
  }
}

// ─── Render Pending ───────────────────────────────────────────────────────────
function renderPendingRefunds() {
  const list = document.getElementById("pendingList");
  const emptyState = document.getElementById("emptyState");
  const pending = state.refunds.filter((r) => r.status === "pending");

  if (emptyState) emptyState.style.display = pending.length === 0 ? "flex" : "none";

  pending.forEach((refund) => {
    if (!list.querySelector(`[data-id="${refund.id}"]`)) {
      list.appendChild(createRefundCard(refund));
    }
  });

  updatePendingCount();
}

// ─── Render History ───────────────────────────────────────────────────────────
function renderHistoryPanel() {
  const historyList = document.getElementById("historyList");
  const historyEmpty = document.getElementById("historyEmpty");
  if (!historyList) return;

  const done = state.refunds.filter(
    (r) => r.status === "approved" || r.status === "rejected"
  );

  if (historyEmpty) historyEmpty.style.display = done.length === 0 ? "flex" : "none";

  historyList.querySelectorAll(".history-card").forEach((c) => c.remove());
  done.forEach((refund) => historyList.appendChild(createHistoryCard(refund)));

  const historyCount = document.getElementById("historyCount");
  if (historyCount) {
    historyCount.textContent = done.length > 0 ? `${done.length} processed` : "";
  }
}

// ─── Animate Remove ───────────────────────────────────────────────────────────
function removeCardWithAnimation(card, callback) {
  card.style.transition =
    "opacity 0.25s ease, transform 0.25s ease, max-height 0.35s ease 0.2s, margin 0.35s ease 0.2s, padding 0.35s ease 0.2s";
  card.style.opacity = "0";
  card.style.transform = "translateX(24px)";
  card.style.overflow = "hidden";

  setTimeout(() => {
    card.style.maxHeight = "0";
    card.style.marginBottom = "0";
    card.style.paddingTop = "0";
    card.style.paddingBottom = "0";
  }, 250);

  setTimeout(() => {
    card.remove();
    if (callback) callback();
  }, 600);
}

// ─── Pending Count ────────────────────────────────────────────────────────────
function updatePendingCount() {
  const countEl = document.getElementById("refundCount");
  if (!countEl) return;
  const n = state.refunds.filter((r) => r.status === "pending").length;
  countEl.textContent = n === 0 ? "No pending" : `${n} pending`;
}

// ─── Server Response ──────────────────────────────────────────────────────────
function handleServerResponse(data) {
  if (!data) return;

  const refunds = extractRefundsFromResponse(data);
  if (refunds.length > 0) {
    mergeRefunds(refunds);
    renderPendingRefunds();
    renderHistoryPanel();
  }

  if (data.message) {
    if (
      data.message.includes("Tool execution requires approval") ||
      data.message.includes("⚠️ Please type")
    ) {
      addChatMessage(
        refunds.length > 0
          ? `📋 Loaded ${refunds.length} pending refund request${refunds.length > 1 ? "s" : ""}. Review them on the right →`
          : "🤖 Type 'refund' to load pending refund requests.",
        "ai"
      );
    } else {
      addChatMessage(data.message, "ai");
    }
  }

  const actionsBar = document.getElementById("actions");
  if (actionsBar) actionsBar.innerHTML = "";
  if (data.type === "approval_required" && Array.isArray(data.options)) {
    renderActionButtons(data.options);
  }
}

// ─── Action Buttons ───────────────────────────────────────────────────────────
function renderActionButtons(options) {
  const bar = document.getElementById("actions");
  bar.innerHTML = "";

  options.forEach((label) => {
    const btn = document.createElement("button");
    const isApprove = label.toLowerCase().includes("approve");
    const isReject = label.toLowerCase().includes("reject");

    btn.className = ["action-btn", isApprove ? "action-btn-approve" : "", isReject ? "action-btn-reject" : ""]
      .filter(Boolean).join(" ");
    btn.textContent = label;

    btn.addEventListener("click", async () => {
      bar.querySelectorAll(".action-btn").forEach((b) => (b.disabled = true));
      const orig = btn.textContent;
      btn.innerHTML = `<span class="btn-spinner"></span>Processing…`;
      setTyping(true);
      try {
        const data = await apiSendDecision(label);
        await sleep(300);
        setTyping(false);
        handleServerResponse(data);
      } catch {
        setTyping(false);
        addChatMessage("❌ Failed. Try again.", "ai");
      } finally {
        btn.textContent = orig;
      }
    });

    bar.appendChild(btn);
  });
}

// ─── Send Message ─────────────────────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const text = input.value.trim();
  if (!text) return;

  addChatMessage(text, "user");
  input.value = "";
  input.disabled = true;
  sendBtn.disabled = true;
  setTyping(true);

  try {
    const data = await apiSendMessage(text);
    await sleep(400);
    setTyping(false);
    handleServerResponse(data);
  } catch {
    setTyping(false);
    addChatMessage("❌ Backend not connected. Make sure server is running on localhost:8000.", "ai");
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("chatInput");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }

  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
    sendBtn.removeAttribute("onclick");
  }
});

// ─── Utils ────────────────────────────────────────────────────────────────────
function scrollToBottom() {
  const el = document.getElementById("messages");
  if (el) setTimeout(() => (el.scrollTop = el.scrollHeight), 50);
}

function getTimeString() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function escapeHtml(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(str).replace(/[&<>"']/g, (m) => map[m]);
}
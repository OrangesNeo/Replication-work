const STORAGE_KEY = "replica-notes-state-v1";
const LOGS_KEY = "replica-notes-logs-v1";
const DRAFTS_KEY = "replica-notes-drafts-v1";

const fallbackProjects = [
  { id: 1, title: "FlashAttention", subtitle: "Fast and Memory-Efficient Exact Attention", author: "Tri Dao · NeurIPS 2022", status: "进行中", progress: 68, area: "系统 / 深度学习", tags: ["CUDA", "Attention"], url: "https://arxiv.org/abs/2205.14135" },
  { id: 2, title: "LoRA", subtitle: "Low-Rank Adaptation of Large Language Models", author: "Hu et al. · ICLR 2022", status: "已完成", progress: 100, area: "大模型 / 微调", tags: ["PEFT", "LLM"], url: "https://arxiv.org/abs/2106.09685" },
  { id: 3, title: "DDPM", subtitle: "Denoising Diffusion Probabilistic Models", author: "Ho et al. · NeurIPS 2020", status: "进行中", progress: 42, area: "生成模型", tags: ["Diffusion", "Vision"], url: "https://arxiv.org/abs/2006.11239" },
  { id: 4, title: "The Annotated Transformer", subtitle: "Attention Is All You Need · 实现笔记", author: "Harvard NLP · 2018", status: "进行中", progress: 17, area: "NLP / 基础", tags: ["PyTorch", "Transformer"], url: "https://nlp.seas.harvard.edu/annotated-transformer/" }
];
const projects = loadProjects();
const id = new URLSearchParams(window.location.search).get("id");
const project = projects.find((item) => String(item.id) === String(id)) || fallbackProjects.find((item) => String(item.id) === String(id)) || projects[0] || fallbackProjects[0];
const editor = document.querySelector("#logEditor");
const logTitle = document.querySelector("#logTitle");
const timeline = document.querySelector("#timeline");
const timelineEmpty = document.querySelector("#timelineEmpty");
const toast = document.querySelector("#projectToast");
const projectRenameModal = document.querySelector("#projectRenameModal");
const projectRenameForm = document.querySelector("#projectRenameForm");
const projectRenameInput = document.querySelector("#projectRenameInput");
const logs = loadLogs();
const drafts = loadDrafts();
let toastTimer;
let draftTimer;

function loadProjects() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (state && Array.isArray(state.projects)) return state.projects;
  } catch (error) { console.warn("Unable to load projects", error); }
  return [];
}

function loadLogs() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOGS_KEY));
    if (saved && typeof saved === "object") return saved;
  } catch (error) { console.warn("Unable to load logs", error); }
  return {};
}

function loadDrafts() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFTS_KEY));
    if (saved && typeof saved === "object") return saved;
  } catch (error) { console.warn("Unable to load drafts", error); }
  return {};
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function sanitizeEditorHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "H2", "H3", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "CODE", "A", "DIV"]);
  const nodes = Array.from(template.content.querySelectorAll("*"));
  nodes.forEach((node) => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    Array.from(node.attributes).forEach((attribute) => {
      if (node.tagName === "A" && attribute.name === "href") return;
      node.removeAttribute(attribute.name);
    });
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href)) node.removeAttribute("href");
      else {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener");
      }
    }
  });
  return template.innerHTML;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2100);
}

function currentLogs() {
  return Array.isArray(logs[project.id]) ? logs[project.id] : [];
}

function renderProject() {
  document.title = `${project.title} · 项目日志 · 复现札记`;
  document.querySelector("#breadcrumbTitle").textContent = project.title;
  document.querySelector("#projectTitle").textContent = project.title;
  document.querySelector("#projectSubtitle").textContent = `${project.subtitle} · ${project.author}`;
  document.querySelector("#heroArea").textContent = project.area.toUpperCase();
  document.querySelector("#projectTags").innerHTML = (project.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  document.querySelector("#paperLink").href = project.url || "#";
  document.querySelector("#referenceLink").href = project.url || "#";
  document.querySelector("#paperMeta").textContent = `${project.author} · ${project.area}`;
  document.querySelector("#projectStatus").textContent = project.status || "进行中";
  document.querySelector("#progressValue").textContent = `${project.progress || 0}%`;
  document.querySelector("#progressFill").style.width = `${project.progress || 0}%`;
  document.querySelector("#progressSlider").value = project.progress || 0;
  document.querySelector("#projectNote").value = project.note || "";
  renderTimeline();
}

function renderTimeline() {
  const entries = currentLogs();
  document.querySelector("#logCount").textContent = `${entries.length} 条记录`;
  document.querySelector("#sideLogCount").textContent = entries.length;
  document.querySelector("#lastUpdated").textContent = entries[0]?.dateLabel || "—";
  timelineEmpty.hidden = entries.length > 0;
  timeline.innerHTML = entries.map((entry) => `<article class="timeline-entry"><div class="timeline-meta"><time>${escapeHtml(entry.dateLabel)}</time><span>${escapeHtml(entry.progress)}% 完成度</span></div><h3>${escapeHtml(entry.title)}</h3><div class="timeline-content">${sanitizeEditorHtml(entry.content)}</div></article>`).join("");
}

function saveLogs() {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function saveProjectState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!state || !Array.isArray(state.projects)) return;
    const target = state.projects.find((item) => String(item.id) === String(project.id));
    if (target) {
      target.title = project.title;
      target.progress = Number(document.querySelector("#progressSlider").value);
      target.status = document.querySelector("#projectStatus").textContent;
      target.note = document.querySelector("#projectNote").value.trim();
      target.updated = "刚刚";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (error) { console.warn("Unable to save project", error); }
}

function execCommand(command, value = null) {
  editor.focus();
  document.execCommand(command, false, value);
  markDraft();
}

function markDraft() {
  document.querySelector("#autosaveStatus").textContent = "草稿未保存";
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    drafts[project.id] = { title: logTitle.value, content: sanitizeEditorHtml(editor.innerHTML) };
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    document.querySelector("#autosaveStatus").textContent = "草稿已自动保存";
  }, 450);
}

function restoreDraft() {
  const draft = drafts[project.id];
  if (!draft) return;
  logTitle.value = draft.title || "";
  editor.innerHTML = sanitizeEditorHtml(draft.content);
  document.querySelector("#autosaveStatus").textContent = "已恢复本地草稿";
}

function saveEntry() {
  const title = logTitle.value.trim();
  const content = sanitizeEditorHtml(editor.innerHTML.trim());
  if (!title || !content) {
    showToast("请填写标题和实验内容");
    if (!title) logTitle.focus(); else editor.focus();
    return;
  }
  const progress = Number(document.querySelector("#progressSlider").value);
  const now = new Date();
  const dateLabel = `刚刚 · ${now.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} ${now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  if (!logs[project.id]) logs[project.id] = [];
  logs[project.id].unshift({ id: Date.now(), title, content, progress, dateLabel });
  saveLogs();
  saveProjectState();
  delete drafts[project.id];
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  logTitle.value = "";
  editor.innerHTML = "";
  document.querySelector("#autosaveStatus").textContent = "已保存到本地";
  renderTimeline();
  showToast("实验日志已保存");
}

document.querySelectorAll(".format-toolbar [data-command]").forEach((button) => button.addEventListener("click", () => execCommand(button.dataset.command, button.dataset.value || null)));
document.querySelectorAll(".format-toolbar [data-block]").forEach((button) => button.addEventListener("click", () => execCommand("formatBlock", `<${button.dataset.block}>`)));
document.querySelector("#addLinkButton").addEventListener("click", () => {
  const url = window.prompt("输入链接地址");
  if (url) execCommand("createLink", url);
});
editor.addEventListener("input", markDraft);
logTitle.addEventListener("input", markDraft);
document.querySelector("#saveLogButton").addEventListener("click", saveEntry);
document.querySelector("#progressSlider").addEventListener("input", (event) => {
  document.querySelector("#progressValue").textContent = `${event.target.value}%`;
  document.querySelector("#progressFill").style.width = `${event.target.value}%`;
  saveProjectState();
});
document.querySelector("#saveProjectNote").addEventListener("click", () => { saveProjectState(); showToast("项目备注已保存"); });
document.querySelector("#statusButton").addEventListener("click", () => {
  const button = document.querySelector("#statusButton");
  const menu = document.createElement("div");
  menu.className = "status-menu";
  menu.innerHTML = ["进行中", "已完成", "暂停"].map((status) => `<button type="button" data-status="${status}">${status}</button>`).join("");
  const rect = button.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 5}px`;
  menu.style.left = `${Math.max(12, rect.right - 130)}px`;
  document.body.appendChild(menu);
  menu.addEventListener("click", (event) => {
    const status = event.target.closest("[data-status]")?.dataset.status;
    if (!status) return;
    document.querySelector("#projectStatus").textContent = status;
    saveProjectState();
    menu.remove();
    showToast(`状态已更新：${status}`);
  });
  const removeMenu = (event) => { if (!menu.contains(event.target) && event.target !== button) { menu.remove(); document.removeEventListener("click", removeMenu); } };
  setTimeout(() => document.addEventListener("click", removeMenu), 0);
});
document.querySelector("#projectMenuButton").addEventListener("click", (event) => {
  document.querySelector(".project-options-menu")?.remove();
  const menuButton = event.currentTarget;
  const menu = document.createElement("div");
  menu.className = "status-menu project-options-menu";
  menu.innerHTML = `<button type="button" data-option="rename">重命名项目</button><button type="button" data-option="paper">打开论文原文</button><button class="danger-menu-item" type="button" data-option="delete">删除项目</button>`;
  const rect = menuButton.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 5}px`;
  menu.style.left = `${Math.max(12, rect.right - 130)}px`;
  document.body.appendChild(menu);
  menu.addEventListener("click", (menuEvent) => {
    const option = menuEvent.target.closest("[data-option]")?.dataset.option;
    if (option === "rename") {
      projectRenameInput.value = project.title;
      projectRenameModal.showModal();
      projectRenameInput.focus();
      projectRenameInput.select();
    }
    if (option === "paper") {
      if (project.url && project.url !== "#") window.open(project.url, "_blank", "noopener");
      else showToast("这个项目还没有论文链接");
    }
    if (option === "delete") {
      const confirmed = window.confirm(`确定要删除“${project.title}”吗？该项目的日志、草稿和最近记录都会被删除。`);
      if (confirmed) {
        try {
          const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
          state.projects = Array.isArray(state.projects) ? state.projects.filter((item) => String(item.id) !== String(project.id)) : [];
          state.activities = Array.isArray(state.activities) ? state.activities.filter((activity) => activity.project !== project.title) : [];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          const savedLogs = JSON.parse(localStorage.getItem(LOGS_KEY) || "{}");
          const savedDrafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
          delete savedLogs[project.id];
          delete savedDrafts[project.id];
          localStorage.setItem(LOGS_KEY, JSON.stringify(savedLogs));
          localStorage.setItem(DRAFTS_KEY, JSON.stringify(savedDrafts));
          window.location.href = "index.html#projectsSection";
        } catch (error) {
          console.warn("Unable to delete project", error);
          showToast("删除失败，请稍后重试");
        }
      }
    }
    menu.remove();
  });
  setTimeout(() => document.addEventListener("click", function dismissOptions(menuEvent) {
    if (!menu.contains(menuEvent.target) && !menuButton.contains(menuEvent.target)) {
      menu.remove();
      document.removeEventListener("click", dismissOptions);
    }
  }), 0);
});

projectRenameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextTitle = projectRenameInput.value.trim();
  if (!nextTitle) { showToast("项目名称不能为空"); return; }
  const duplicate = projects.some((item) => item !== project && item.title.toLowerCase() === nextTitle.toLowerCase());
  if (duplicate) { showToast("已经存在同名项目"); return; }
  const previousTitle = project.title;
  project.title = nextTitle;
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (state && Array.isArray(state.projects)) {
      const target = state.projects.find((item) => String(item.id) === String(project.id));
      if (target) { target.title = nextTitle; target.updated = "刚刚"; }
      state.activities?.forEach((activity) => { if (activity.project === previousTitle) activity.project = nextTitle; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (error) { console.warn("Unable to rename project", error); }
  renderProject();
  projectRenameModal.close();
  showToast("项目已重命名");
});

document.querySelector("#closeProjectRename").addEventListener("click", () => projectRenameModal.close());
document.querySelector("#cancelProjectRename").addEventListener("click", () => projectRenameModal.close());

renderProject();
restoreDraft();

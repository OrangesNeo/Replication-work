const STORAGE_KEY = "replica-notes-state-v1";
const LOGS_KEY = "replica-notes-logs-v1";
const DRAFTS_KEY = "replica-notes-drafts-v1";

const DAILY_QUOTES = [
  { text: "千里之行，始于足下。", source: "— 老子，《道德经》第六十四章" },
  { text: "学而不思则罔，思而不学则殆。", source: "— 孔子，《论语·为政》" },
  { text: "The best way out is always through.", source: "— Robert Frost, \"A Servant to Servants\" (1914)" },
  { text: "If I have seen further, it is by standing on the shoulders of giants.", source: "— Isaac Newton, 致 Robert Hooke 的信 (1675)" },
  { text: "The purpose of computing is insight, not numbers.", source: "— Richard Hamming, \"The Art of Doing Science and Engineering\" (1997)" },
  { text: "What I cannot create, I do not understand.", source: "— Richard Feynman, 黑板笔记 (1988)" }
];

const defaultState = {
  projects: [
    { id: 1, title: "FlashAttention", subtitle: "Fast and Memory-Efficient Exact Attention", author: "Tri Dao · NeurIPS 2022", status: "进行中", progress: 68, area: "系统 / 深度学习", space: "systems", updated: "2 小时前", metric: "1.8×", tags: ["CUDA", "Attention"], url: "https://arxiv.org/abs/2205.14135" },
    { id: 2, title: "LoRA", subtitle: "Low-Rank Adaptation of Large Language Models", author: "Hu et al. · ICLR 2022", status: "已完成", progress: 100, area: "大模型 / 微调", space: "deep", updated: "昨天", metric: "-41%", tags: ["PEFT", "LLM"], url: "https://arxiv.org/abs/2106.09685" },
    { id: 3, title: "DDPM", subtitle: "Denoising Diffusion Probabilistic Models", author: "Ho et al. · NeurIPS 2020", status: "进行中", progress: 42, area: "生成模型", space: "deep", updated: "3 天前", metric: "0.68", tags: ["Diffusion", "Vision"], url: "https://arxiv.org/abs/2006.11239" },
    { id: 4, title: "The Annotated Transformer", subtitle: "Attention Is All You Need · 实现笔记", author: "Harvard NLP · 2018", status: "进行中", progress: 17, area: "NLP / 基础", space: "tools", updated: "5 天前", metric: "12/72", tags: ["PyTorch", "Transformer"], url: "https://nlp.seas.harvard.edu/annotated-transformer/" }
  ],
  activities: [
    { id: 1, date: "今天 · 14:32", title: "显存峰值终于对齐了", body: "把 block size 从 128 调整到 64，forward 的峰值降到 15.2GB。", project: "FlashAttention" },
    { id: 2, date: "昨天 · 19:08", title: "LoRA 的 rank ablation 完成", body: "r=8 在当前数据集上达到最优，验证集准确率 91.4%。", project: "LoRA" },
    { id: 3, date: "周一 · 11:20", title: "DDPM 采样速度记录", body: "用 DDIM 采样 50 steps，单张图生成耗时 0.84s。", project: "DDPM" }
  ]
};

let state = loadState();
let activeFilter = "all";
let activeSpace = "all";
let toastTimer;
let projectTitleClickTimer;

const projectsList = document.querySelector("#projectsList");
const activityList = document.querySelector("#activityList");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const updateModal = document.querySelector("#updateModal");
const updateForm = document.querySelector("#updateForm");
const progressInput = document.querySelector("#progressInput");
const progressOutput = document.querySelector("#progressOutput");
const infoModal = document.querySelector("#infoModal");
const detailsModal = document.querySelector("#detailsModal");
const renameModal = document.querySelector("#renameModal");
const renameForm = document.querySelector("#renameForm");
const renameInput = document.querySelector("#renameInput");
const activityEditModal = document.querySelector("#activityEditModal");
const activityEditForm = document.querySelector("#activityEditForm");
const activityTitleInput = document.querySelector("#activityTitleInput");
const activityBodyInput = document.querySelector("#activityBodyInput");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.projects) && Array.isArray(saved.activities)) {
      return {
        projects: saved.projects.map((project) => ({ ...project, space: project.space || "tools", tags: Array.isArray(project.tags) ? project.tags : [], url: project.url || "#" })),
        activities: saved.activities.map((activity, index) => ({ ...activity, id: activity.id ?? `activity-${index}-${Date.now()}` }))
      };
    }
  } catch (error) {
    console.warn("Unable to load saved notes", error);
  }
  const initialState = structuredClone(defaultState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
  return initialState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function setActiveNav(activeLink) {
  document.querySelectorAll(".nav-item[data-nav-target]").forEach((link) => link.classList.toggle("active", link === activeLink));
}

function renderProjects() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = state.projects.filter((project) => {
    const matchesFilter = activeFilter === "all" || project.status === activeFilter;
    const matchesSpace = activeSpace === "all" || project.space === activeSpace;
    const haystack = [project.title, project.subtitle, project.author, project.area, ...project.tags].join(" ").toLowerCase();
    return matchesFilter && matchesSpace && (!query || haystack.includes(query));
  });

  projectsList.innerHTML = filtered.map((project) => {
    const completed = project.status === "已完成";
    const projectPage = `project.html?id=${encodeURIComponent(project.id)}`;
    return `<article class="project-card" data-project-href="${projectPage}" role="link" tabindex="0" aria-label="打开 ${escapeHtml(project.title)} 项目日志">
      <div class="project-main">
        <div class="project-topline"><span class="project-status ${completed ? "completed" : ""}"><span class="status-dot"></span>${escapeHtml(project.status)}</span><span class="project-area">${escapeHtml(project.area)}</span><button class="project-menu-button" type="button" data-project-menu="${escapeHtml(project.id)}" title="项目设置" aria-label="打开 ${escapeHtml(project.title)} 的设置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></button></div>
        <h3 title="双击可重命名"><button class="project-title-button" type="button" data-project-title="${escapeHtml(project.id)}">${escapeHtml(project.title)} <span aria-hidden="true">↗</span></button></h3>
        <p class="project-meta">${escapeHtml(project.subtitle)} · ${escapeHtml(project.author)}</p>
        <div class="project-tags">${project.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      </div>
      <div class="project-side"><div class="project-percent"><strong>${project.progress}%</strong><span>目标 ${escapeHtml(project.metric)}</span></div><div class="progress-track"><div class="progress-fill ${completed ? "completed" : ""}" style="width: ${project.progress}%"></div></div><span class="project-updated">更新于 ${escapeHtml(project.updated)}</span></div>
    </article>`;
  }).join("");
  emptyState.hidden = filtered.length > 0;
  document.querySelector("#allCount").textContent = String(state.projects.length).padStart(2, "0");
  document.querySelector("#activeCount").textContent = String(state.projects.filter((item) => item.status === "进行中").length).padStart(2, "0");
  document.querySelector("#completedCount").textContent = String(state.projects.filter((item) => item.status === "已完成").length).padStart(2, "0");
  document.querySelector("#noteCount").textContent = String(Math.max(14, state.activities.length)).padStart(2, "0");
}

function renderActivities() {
  activityList.innerHTML = state.activities.slice(0, 5).map((activity) => `<article class="activity-item" data-activity-id="${escapeHtml(activity.id)}"><time class="activity-date">${escapeHtml(activity.date)}</time><div class="activity-item-head"><h3>${escapeHtml(activity.title)}</h3><div class="activity-actions"><button class="activity-action-button" type="button" data-activity-action="edit" title="编辑记录" aria-label="编辑记录"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 16-.8 4.8L8 20l10.8-10.8a2.1 2.1 0 0 0-3-3L4 16Z"/><path d="m14.5 7.5 2 2"/></svg></button><button class="activity-action-button danger" type="button" data-activity-action="delete" title="删除记录" aria-label="删除记录"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div></div><p>${escapeHtml(activity.body)}</p><button class="activity-project activity-project-button" type="button" data-project-name="${escapeHtml(activity.project)}">${escapeHtml(activity.project)} ↗</button></article>`).join("");
}

function getFocusProject() {
  const activeProjects = state.projects.filter((project) => project.status === "进行中");
  return (activeProjects.length ? activeProjects : state.projects).reduce((fastest, project) => (!fastest || Number(project.progress) > Number(fastest.progress) ? project : fastest), null);
}

function renderFocusProject() {
  const focusProject = getFocusProject();
  const focusButton = document.querySelector("#focusDetailsButton");
  if (!focusProject) {
    document.querySelector("#focusTitle").textContent = "暂无主线项目";
    document.querySelector("#focusSubtitle").textContent = "新增一个复现项目后，这里会自动显示进度最快的进行中项目。";
    document.querySelector("#focusAuthor").textContent = "";
    document.querySelector("#focusTags").innerHTML = "";
    document.querySelector("#focusRing").style.background = "conic-gradient(var(--lime) 0 0%, #36403a 0% 100%)";
    document.querySelector("#focusProgressText").innerHTML = "0<small>%</small>";
    document.querySelector("#focusEta").textContent = "等待项目";
    document.querySelector("#focusNoteText").textContent = "还没有可展示的实验记录。";
    document.querySelector("#focusNoteTime").textContent = "";
    focusButton.disabled = true;
    return;
  }
  const progress = Math.max(0, Math.min(100, Number(focusProject.progress) || 0));
  const latestNote = state.activities.find((activity) => activity.project === focusProject.title);
  document.querySelector("#focusKicker").textContent = `FOCUS / ${focusProject.area.toUpperCase()}`;
  document.querySelector("#focusTitle").textContent = focusProject.title;
  document.querySelector("#focusSubtitle").textContent = focusProject.subtitle;
  document.querySelector("#focusAuthor").textContent = focusProject.author;
  document.querySelector("#focusTags").innerHTML = focusProject.tags.map((tag, index) => `<span class="tag ${index === 0 ? "dark-tag" : ""}">${escapeHtml(tag)}</span>`).join("");
  document.querySelector("#focusRing").style.background = `conic-gradient(var(--lime) 0 ${progress}%, #36403a ${progress}% 100%)`;
  document.querySelector("#focusRing").setAttribute("aria-label", `完成度 ${progress}%`);
  document.querySelector("#focusProgressText").innerHTML = `${progress}<small>%</small>`;
  document.querySelector("#focusEta").textContent = focusProject.status === "已完成" ? "已完成" : progress >= 80 ? "即将完成" : "进行中";
  document.querySelector("#focusNoteText").textContent = latestNote ? latestNote.body : "还没有实验记录，写下第一条进展吧。";
  document.querySelector("#focusNoteTime").textContent = latestNote ? latestNote.date : "";
  focusButton.disabled = false;
  focusButton.dataset.focusProjectId = focusProject.id;
}

function renderDailyQuote() {
  const now = new Date();
  const dayIndex = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const quote = DAILY_QUOTES[((dayIndex % DAILY_QUOTES.length) + DAILY_QUOTES.length) % DAILY_QUOTES.length];
  document.querySelector("#dailyQuoteText").textContent = quote.text;
  document.querySelector("#dailyQuoteSource").textContent = quote.source;
  document.querySelector("#dailyQuoteDate").textContent = now.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

function render() {
  renderProjects();
  renderActivities();
  renderFocusProject();
  renderDailyQuote();
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === filter));
  renderProjects();
}

function setSpace(space) {
  activeSpace = space;
  document.querySelectorAll(".space-item").forEach((item) => item.classList.toggle("selected", item.dataset.space === space));
  setFilter("all");
  document.querySelector("#projectsSection").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(space === "deep" ? "已筛选：深度学习" : space === "systems" ? "已筛选：系统论文" : "已筛选：工具与方法");
}

function openModal() {
  updateForm.reset();
  progressInput.value = "50";
  progressOutput.textContent = "50%";
  updateModal.showModal();
  updateForm.elements.project.focus();
}

function closeModal() {
  if (updateModal.open) updateModal.close();
}

function openInfo(title, body, link = "") {
  document.querySelector("#infoTitle").textContent = title;
  document.querySelector("#infoBody").innerHTML = body;
  const infoLink = document.querySelector("#infoLink");
  infoLink.hidden = !link;
  infoLink.href = link || "#";
  infoModal.showModal();
}

function closeInfo() {
  if (infoModal.open) infoModal.close();
}

function openDetails(project) {
  if (!project) return;
  const notes = state.activities.filter((activity) => activity.project === project.title).length;
  document.querySelector("#detailsTitle").textContent = project.title;
  document.querySelector("#detailsBody").innerHTML = `<p class="detail-lead">${escapeHtml(project.subtitle)}</p><dl class="detail-list"><div><dt>当前状态</dt><dd>${escapeHtml(project.status)}</dd></div><div><dt>复现完成度</dt><dd>${project.progress}%</dd></div><div><dt>研究空间</dt><dd>${escapeHtml(project.area)}</dd></div><div><dt>记录条数</dt><dd>${notes} 条</dd></div></dl><p class="detail-note">论文原文链接会在新标签页打开，方便你边读边回到复现记录。</p>`;
  document.querySelector("#detailsLink").href = project.url || "#";
  detailsModal.showModal();
}

function closeDetails() {
  if (detailsModal.open) detailsModal.close();
}

function closeProjectMenu() {
  document.querySelector(".project-context-menu")?.remove();
}

function openRename(projectId) {
  closeProjectMenu();
  const project = state.projects.find((item) => String(item.id) === String(projectId));
  if (!project) return;
  renameModal.dataset.projectId = String(project.id);
  renameInput.value = project.title;
  renameModal.showModal();
  renameInput.focus();
  renameInput.select();
}

function closeRename() {
  if (renameModal.open) renameModal.close();
}

function openActivityEdit(activity) {
  if (!activity) return;
  activityEditModal.dataset.activityId = String(activity.id);
  activityTitleInput.value = activity.title;
  activityBodyInput.value = activity.body;
  activityEditModal.showModal();
  activityTitleInput.focus();
  activityTitleInput.select();
}

function closeActivityEdit() {
  if (activityEditModal.open) activityEditModal.close();
}

function openProjectMenu(button, projectId) {
  closeProjectMenu();
  const project = state.projects.find((item) => String(item.id) === String(projectId));
  if (!project) return;
  const menu = document.createElement("div");
  menu.className = "project-context-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `<button type="button" data-menu-action="open">打开项目日志</button><button type="button" data-menu-action="rename">重命名</button><button type="button" data-menu-action="paper">打开论文原文</button><button class="danger-menu-item" type="button" data-menu-action="delete">删除项目</button>`;
  const rect = button.getBoundingClientRect();
  const menuHeight = 145;
  menu.style.top = `${rect.bottom + 5 + menuHeight > window.innerHeight ? rect.top - menuHeight - 5 : rect.bottom + 5}px`;
  menu.style.left = `${Math.max(10, rect.right - 150)}px`;
  document.body.appendChild(menu);
  menu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-menu-action]")?.dataset.menuAction;
    if (action === "open") window.location.href = `project.html?id=${encodeURIComponent(project.id)}`;
    if (action === "rename") openRename(project.id);
    if (action === "paper") {
      if (project.url && project.url !== "#") window.open(project.url, "_blank", "noopener");
      else showToast("这个项目还没有论文链接");
    }
    if (action === "delete") deleteProject(project);
    if (action !== "rename") closeProjectMenu();
  });
  setTimeout(() => document.addEventListener("click", function dismissMenu(event) {
    if (!menu.contains(event.target) && event.target !== button && !button.contains(event.target)) {
      menu.remove();
      document.removeEventListener("click", dismissMenu);
    }
  }), 0);
}

function deleteProject(project) {
  const confirmed = window.confirm(`确定要删除“${project.title}”吗？该项目的日志、草稿和最近记录都会被删除。`);
  if (!confirmed) return;
  state.projects = state.projects.filter((item) => item !== project);
  state.activities = state.activities.filter((activity) => activity.project !== project.title);
  saveState();
  try {
    const savedLogs = JSON.parse(localStorage.getItem(LOGS_KEY) || "{}");
    const savedDrafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
    delete savedLogs[project.id];
    delete savedDrafts[project.id];
    localStorage.setItem(LOGS_KEY, JSON.stringify(savedLogs));
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(savedDrafts));
  } catch (error) { console.warn("Unable to clean project logs", error); }
  render();
  showToast("项目已删除");
}

document.querySelectorAll(".filter-tab").forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filter)));
document.querySelectorAll(".space-item").forEach((button) => button.addEventListener("click", () => setSpace(button.dataset.space)));
document.querySelectorAll(".nav-item[data-nav-target]").forEach((link) => link.addEventListener("click", () => setActiveNav(link)));

document.querySelector('[data-action="bookmarks"]').addEventListener("click", (event) => {
  event.preventDefault();
  openInfo("我的书签", `<p class="info-copy">这里会集中保存你想继续阅读或复现的论文。</p><div class="bookmark-list"><a href="https://arxiv.org/abs/2205.14135" target="_blank" rel="noopener">FlashAttention <span>arXiv ↗</span></a><a href="https://arxiv.org/abs/2106.09685" target="_blank" rel="noopener">LoRA <span>arXiv ↗</span></a></div>`);
});

searchInput.addEventListener("input", renderProjects);
document.querySelector("#openModalButton").addEventListener("click", openModal);
document.querySelector("#openModalButtonSecondary").addEventListener("click", openModal);
document.querySelector("#closeModalButton").addEventListener("click", closeModal);
document.querySelector("#cancelModalButton").addEventListener("click", closeModal);
progressInput.addEventListener("input", () => { progressOutput.textContent = `${progressInput.value}%`; });

document.querySelector("#focusDetailsButton").addEventListener("click", () => {
  const project = state.projects.find((item) => String(item.id) === document.querySelector("#focusDetailsButton").dataset.focusProjectId) || getFocusProject();
  if (project) window.location.href = `project.html?id=${encodeURIComponent(project.id)}`;
});
document.querySelector("#viewActivityButton").addEventListener("click", () => document.querySelector("#activitySection").scrollIntoView({ behavior: "smooth", block: "start" }));
document.querySelector("#notificationButton").addEventListener("click", () => openInfo("通知", `<ul class="info-list"><li><strong>FlashAttention</strong><span>backward kernel 仍有 12% 显存偏差</span></li><li><strong>连续记录</strong><span>你已经连续记录 12 天</span></li><li><strong>本地同步</strong><span>最新数据已保存在浏览器</span></li></ul>`));
document.querySelector("#moreButton").addEventListener("click", () => openInfo("快捷操作", `<div class="quick-actions"><button type="button" data-quick-action="new">新增复现记录</button><button type="button" data-quick-action="clear">清除当前筛选</button></div>`));
document.querySelector("#profileButton").addEventListener("click", () => openInfo("Lin 的空间", `<p class="info-copy">这是一个本地优先的研究记录空间。你新增的复现进度会保存在当前浏览器中。</p><div class="profile-status"><span class="sync-dot"></span>本地已同步</div>`));
document.querySelector("#closeInfoButton").addEventListener("click", closeInfo);
document.querySelector("#dismissInfoButton").addEventListener("click", closeInfo);
document.querySelector("#closeDetailsButton").addEventListener("click", closeDetails);
document.querySelector("#dismissDetailsButton").addEventListener("click", closeDetails);

document.querySelector("#infoBody").addEventListener("click", (event) => {
  const action = event.target.closest("[data-quick-action]")?.dataset.quickAction;
  if (action === "new") { closeInfo(); openModal(); }
  if (action === "clear") { activeSpace = "all"; searchInput.value = ""; setFilter("all"); closeInfo(); showToast("已清除筛选"); }
});

activityList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-activity-action]");
  if (actionButton) {
    const activity = state.activities.find((item) => String(item.id) === String(actionButton.closest("[data-activity-id]")?.dataset.activityId));
    if (actionButton.dataset.activityAction === "edit") openActivityEdit(activity);
    if (actionButton.dataset.activityAction === "delete" && activity) {
      const confirmed = window.confirm(`确定要删除“${activity.title}”这条记录吗？`);
      if (confirmed) {
        state.activities = state.activities.filter((item) => item !== activity);
        saveState();
        render();
        showToast("最近记录已删除");
      }
    }
    return;
  }
  const button = event.target.closest("[data-project-name]");
  if (!button) return;
  const project = state.projects.find((item) => item.title === button.dataset.projectName);
  if (project) window.location.href = `project.html?id=${encodeURIComponent(project.id)}`;
});

activityEditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const activity = state.activities.find((item) => String(item.id) === activityEditModal.dataset.activityId);
  const title = activityTitleInput.value.trim();
  const body = activityBodyInput.value.trim();
  if (!activity || !title || !body) { showToast("标题和内容不能为空"); return; }
  activity.title = title;
  activity.body = body;
  saveState();
  render();
  closeActivityEdit();
  showToast("最近记录已更新");
});

document.querySelector("#closeActivityEditButton").addEventListener("click", closeActivityEdit);
document.querySelector("#cancelActivityEditButton").addEventListener("click", closeActivityEdit);

projectsList.addEventListener("click", (event) => {
  const menuButton = event.target.closest("[data-project-menu]");
  if (menuButton) {
    openProjectMenu(menuButton, menuButton.dataset.projectMenu);
    return;
  }
  const titleButton = event.target.closest("[data-project-title]");
  if (titleButton) {
    clearTimeout(projectTitleClickTimer);
    projectTitleClickTimer = setTimeout(() => {
      window.location.href = `project.html?id=${encodeURIComponent(titleButton.dataset.projectTitle)}`;
    }, 260);
    return;
  }
  if (event.target.closest("a, button")) return;
  const card = event.target.closest("[data-project-href]");
  if (card) window.location.href = card.dataset.projectHref;
});

projectsList.addEventListener("dblclick", (event) => {
  const titleButton = event.target.closest("[data-project-title]");
  if (!titleButton) return;
  event.preventDefault();
  clearTimeout(projectTitleClickTimer);
  openRename(titleButton.dataset.projectTitle);
});

projectsList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("button, a")) return;
  const card = event.target.closest("[data-project-href]");
  if (!card) return;
  event.preventDefault();
  window.location.href = card.dataset.projectHref;
});

updateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(updateForm);
  const title = data.get("project").trim();
  const status = data.get("status");
  const progress = Number(data.get("progress"));
  const note = data.get("note").trim();
  const existing = state.projects.find((project) => project.title.toLowerCase() === title.toLowerCase());
  if (existing) {
    existing.progress = progress;
    existing.status = status;
    existing.updated = "刚刚";
  } else {
    state.projects.unshift({ id: Date.now(), title, subtitle: "新的复现项目", author: "个人研究记录", status, progress, area: "未分类", space: "tools", updated: "刚刚", metric: "待测", tags: ["新项目"], url: "#" });
  }
  state.activities.unshift({ id: Date.now(), date: "刚刚", title: progress >= 100 ? "复现完成，记录结果" : "更新了复现进度", body: note, project: title });
  saveState();
  render();
  closeModal();
  showToast("复现记录已保存");
});

renameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const project = state.projects.find((item) => String(item.id) === renameModal.dataset.projectId);
  const nextTitle = renameInput.value.trim();
  if (!project || !nextTitle) {
    showToast("项目名称不能为空");
    renameInput.focus();
    return;
  }
  const duplicate = state.projects.some((item) => item !== project && item.title.toLowerCase() === nextTitle.toLowerCase());
  if (duplicate) {
    showToast("已经存在同名项目");
    renameInput.focus();
    return;
  }
  const previousTitle = project.title;
  project.title = nextTitle;
  project.updated = "刚刚";
  state.activities.forEach((activity) => { if (activity.project === previousTitle) activity.project = nextTitle; });
  saveState();
  render();
  closeRename();
  showToast("项目已重命名");
});

document.querySelector("#closeRenameButton").addEventListener("click", closeRename);
document.querySelector("#cancelRenameButton").addEventListener("click", closeRename);

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape") {
    closeModal();
    closeInfo();
    closeDetails();
    closeRename();
    closeActivityEdit();
    closeProjectMenu();
  }
});

render();

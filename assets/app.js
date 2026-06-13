const TOPIC_CATEGORIES = ["钱放哪里", "钱留给什么目标", "港险怎么买、怎么用"];
const ACCOUNT_STATUSES = ["全部", "核心监控", "重点跟踪", "选题参考", "新形式待观察"];

const state = {
  index: null,
  datasets: new Map(),
  latest: null,
  filter: "全部",
  query: "",
  historyDate: "",
  historyFilter: "全部",
  historyQuery: "",
  accountType: "全部",
  accountStatus: "全部",
  accountQuery: ""
};

const elements = {};

const esc = value => String(value ?? "").replace(
  /[&<>"']/g,
  character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]
);

const searchable = item => Object.values(item || {}).join(" ").toLowerCase();
const isPriority = topic => /立即|核心|高价值|值得拍|必做|优先/.test(topic.priority || "");

function formatCnDate(date) {
  const [year, month, day] = String(date).split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function recommendedSlot(topic) {
  if (topic.accountSlot) return topic.accountSlot;
  if (/后段|方案|产品比较|复核/.test(topic.stage || "")) return "真人主IP";
  if (/立即|冲突|数字/.test(`${topic.priority || ""} ${topic.logic || ""}`)) return "真人营销账号";
  return "矩阵号";
}

function recommendation(topic) {
  return topic.recommendation || topic.logic || topic.angle || topic.pain || "值得结合原视频证据进一步研究。";
}

function topicStatus(topic) {
  return topic.status || (topic.source === "临时洞察" ? "临时洞察" : "已入库");
}

function accountFormat(account) {
  if (account.contentFormat) return account.contentFormat;
  const formats = {
    "真人专业型": "真人出镜 · 专业判断",
    "真人营销型": "真人出镜 · 高频营销测试",
    "图文资料型": "图文资料卡 · 低成本表达",
    "AI/素材型": "AI/素材画面 · 旁白栏目"
  };
  return formats[account.type] || account.type || "待观察的新形式";
}

function accountBorrowDimension(account) {
  return account.borrowDimension || account.value || account.reason || "选题与表达结构";
}

function accountServiceTarget(account) {
  if (account.serviceTarget) return account.serviceTarget;
  const text = `${account.domain || ""} ${account.value || ""} ${account.reason || ""}`;
  const targets = [];
  if (/老板|企业|传承|潮汕/.test(text)) targets.push("思彤");
  if (/女性|婚前|婚姻|家庭节点/.test(text)) targets.push("卡罗");
  if (/养老|选择权|不婚|丁克|LGBT|全球|跨境|CRS/.test(text)) targets.push("熙纶");
  if (/高净值|教育|计划书|产品比较|专业|复核/.test(text)) targets.push("特老师");
  if (!targets.length) {
    if (account.type === "真人营销型") return "真人营销账号";
    if (["图文资料型", "AI/素材型"].includes(account.type)) return "低成本矩阵号";
    return "真人主IP";
  }
  return [...new Set(targets)].join(" / ");
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} 读取失败（${response.status}）`);
  return response.json();
}

async function getDataset(date) {
  if (state.datasets.has(date)) return state.datasets.get(date);
  const dataset = await fetchJson(`data/${date}.json`);
  state.datasets.set(date, dataset);
  return dataset;
}

async function loadData() {
  state.index = await fetchJson("data/index.json");
  const dates = [...state.index.dates].sort().reverse();
  if (!dates.length || !state.index.latest) throw new Error("data/index.json 没有可用日期");

  state.latest = await getDataset(state.index.latest);
  if (!state.latest) throw new Error(`最新日期 ${state.index.latest} 缺少数据文件`);
  state.historyDate = state.index.latest;
}

function renderMasthead() {
  document.title = `港险选题洞察看板｜${state.latest.date} ${state.latest.updatedAt}更新`;
  elements.mastMeta.innerHTML = `<strong>${formatCnDate(state.latest.date)} · ${esc(state.latest.updatedAt)}更新</strong>抖音公开搜索样本 · 内部选题会使用<br>思彤 / 熙纶 / 卡罗 / 特老师`;
}

function renderOverview() {
  elements.summaryLabel.textContent = `今日核心判断 · 采集日期 ${state.latest.date}`;
  elements.coreJudgment.textContent = state.latest.coreJudgment || "今日暂无单独核心判断，请直接查看入库选题。";
  elements.selectionTitle.textContent = state.latest.selectionPrinciple?.title || "平台证据优先";
  elements.selectionDetail.textContent = state.latest.selectionPrinciple?.detail || "以公开平台样本和业务启发决定是否入库，不设置固定数量。";
}

function renderSignals() {
  const competition = state.latest.competitionSignals || [];
  elements.competitionSignals.innerHTML = competition.map((item, index) => `
    <li class="signal-item">
      <span class="signal-index">${String(index + 1).padStart(2, "0")}</span>
      <div>
        <div class="signal-top">
          <a href="${esc(item.link)}" target="_blank" rel="noopener">${esc(item.name)} ↗</a>
          <span class="signal-status ${esc(item.statusClass || "")}">${esc(item.status)}</span>
        </div>
        <p><strong>异动依据：</strong>${esc(item.reason)}</p>
      </div>
    </li>
  `).join("") || '<li class="signal-placeholder">今日暂无新增竞品异动。</li>';

  const radar = state.latest.topicRadar || [];
  elements.topicRadar.innerHTML = radar.map((item, index) => `
    <li class="signal-item">
      <span class="signal-index">${String(index + 1).padStart(2, "0")}</span>
      <div>
        <div class="signal-top">
          <strong>${esc(item.topic)}</strong>
          <span class="signal-status ${esc(item.statusClass || "")}">${esc(item.status)}</span>
        </div>
        <p>${esc(item.note)}</p>
      </div>
    </li>
  `).join("") || '<li class="signal-placeholder">今日暂无新增话题共振。</li>';
}

function matchesTopic(topic, filter, query) {
  const filterMatch = filter === "全部"
    || topic.category === filter
    || (filter === "动态专题" && String(topic.category).startsWith("专题｜"))
    || String(topic.ip || "").includes(filter);
  return filterMatch && searchable(topic).includes(query.toLowerCase());
}

function topicCard(topic, index, date) {
  return `
    <article class="card decision-card" tabindex="0" data-topic-index="${index}" data-date="${esc(date)}">
      <div class="card-body">
        <div class="eyebrow">
          <span class="badge">${esc(topic.category)}</span>
          <span class="tag">${esc(topic.account)}</span>
          ${isPriority(topic) ? '<span class="priority">优先研究</span>' : ""}
        </div>
        <h3>${esc(topic.title)}</h3>
        <dl class="decision-grid">
          <div><dt>推荐IP</dt><dd>${esc(topic.ip)}</dd></div>
          <div><dt>账号位置</dt><dd>${esc(recommendedSlot(topic))}</dd></div>
          <div><dt>决策阶段</dt><dd>${esc(topic.stage)}</dd></div>
          <div><dt>优先级</dt><dd>${esc(topic.priority)}</dd></div>
        </dl>
        <p class="recommendation"><strong>推荐理由</strong>${esc(recommendation(topic))}</p>
        <div class="card-bottom">
          ${topic.source === "临时洞察" ? '<span class="tag">临时洞察</span>' : ""}
          <span class="card-action">查看完整分析 →</span>
        </div>
      </div>
    </article>
  `;
}

function topicColumns(items, date) {
  const specials = [...new Set(items.map(topic => topic.category).filter(category => String(category).startsWith("专题｜")))];
  const categories = [...TOPIC_CATEGORIES.filter(category => items.some(topic => topic.category === category)), ...specials];
  const descriptions = {
    "钱放哪里": "账户、币种、地区与资产去向",
    "钱留给什么目标": "教育、养老、现金流与家庭任务",
    "港险怎么买、怎么用": "产品、计划书、领取与持单判断"
  };
  const allTopics = state.datasets.get(date).topics;

  return `<div class="topic-columns">${categories.map(category => {
    const group = items.filter(topic => topic.category === category);
    return `
      <section class="topic-column">
        <div class="section-head">
          <h2>${esc(category)}</h2>
          <span>${esc(descriptions[category] || "当天形成平台信号的新问题")} · ${group.length}条</span>
        </div>
        <div class="grid">${group.map(topic => topicCard(topic, allTopics.indexOf(topic), date)).join("")}</div>
      </section>
    `;
  }).join("")}</div>`;
}

function bindTopicOpeners(root, selector = "[data-topic-index]") {
  root.querySelectorAll(selector).forEach(element => {
    const open = () => {
      const dataset = state.datasets.get(element.dataset.date);
      openTopicDrawer(dataset.topics[Number(element.dataset.topicIndex)], element.dataset.date);
    };
    element.addEventListener("click", open);
    element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function renderToday() {
  const date = state.index.latest;
  const topics = state.latest.topics || [];
  const filtered = topics.filter(topic => matchesTopic(topic, state.filter, state.query));
  elements.content.innerHTML = topicColumns(filtered, date);
  elements.empty.style.display = filtered.length ? "none" : "block";
  bindTopicOpeners(elements.content);
}

function renderHistoryDates() {
  const dates = [...state.index.dates].sort().reverse();
  elements.historyDates.innerHTML = dates.map(date => {
    const count = state.index.datasets?.[date]?.topicCount ?? state.datasets.get(date)?.topics?.length ?? 0;
    return `<button class="date-button ${date === state.historyDate ? "active" : ""}" data-date="${date}">${date} · ${count}条</button>`;
  }).join("");
}

function renderHistory() {
  const dataset = state.datasets.get(state.historyDate);
  const topics = dataset?.topics || [];
  const filtered = topics.filter(topic => matchesTopic(topic, state.historyFilter, state.historyQuery));

  elements.historyContent.innerHTML = filtered.length ? `
    <div class="history-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>日期</th><th>选题标题</th><th>话题分类</th><th>来源账号</th>
            <th>推荐IP</th><th>决策阶段</th><th>优先级</th><th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(topic => `
            <tr tabindex="0" data-topic-index="${topics.indexOf(topic)}" data-date="${esc(state.historyDate)}">
              <td>${esc(state.historyDate)}</td>
              <td class="history-title">${esc(topic.title)}</td>
              <td>${esc(topic.category)}</td>
              <td>${esc(topic.account)}</td>
              <td>${esc(topic.ip)}</td>
              <td>${esc(topic.stage)}</td>
              <td>${esc(topic.priority)}</td>
              <td><span class="history-status">${esc(topicStatus(topic))}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";
  elements.historyEmpty.style.display = filtered.length ? "none" : "block";
  bindTopicOpeners(elements.historyContent);
}

function accountCard(account, index) {
  return `
    <article class="account-card compact-account-card" tabindex="0" data-account-index="${index}">
      <div class="account-card-head">
        <div>
          <span class="account-type">${esc(account.type)}</span>
          <h3>${esc(account.name)}</h3>
        </div>
        <span class="account-status">${esc(account.status)}</span>
      </div>
      <dl class="account-summary">
        <div><dt>内容形态</dt><dd>${esc(accountFormat(account))}</dd></div>
        <div><dt>可借鉴维度</dt><dd>${esc(accountBorrowDimension(account))}</dd></div>
        <div><dt>适合服务</dt><dd>${esc(accountServiceTarget(account))}</dd></div>
        <div><dt>最近有效发现</dt><dd>${esc(account.movement)}</dd></div>
      </dl>
      <div class="account-card-footer">
        <span>${esc(account.observed)}</span>
        <span class="card-action">查看账号分析 →</span>
      </div>
    </article>
  `;
}

function renderAccountFilters() {
  const accounts = state.latest.accounts || [];
  const preferred = ["真人专业型", "真人营销型", "图文资料型", "AI/素材型"];
  const discovered = [...new Set(accounts.map(account => account.type))];
  const types = ["全部", ...preferred.filter(type => discovered.includes(type)), ...discovered.filter(type => !preferred.includes(type))];

  elements.accountTypeFilters.innerHTML = types.map(type => `
    <button class="account-filter ${type === state.accountType ? "active" : ""}" data-account-type="${esc(type)}">${esc(type)}</button>
  `).join("");
  elements.accountStatusFilters.innerHTML = ACCOUNT_STATUSES.map(status => `
    <button class="account-filter ${status === state.accountStatus ? "active" : ""}" data-account-status="${esc(status)}">${esc(status)}</button>
  `).join("");
}

function renderAccounts() {
  const accounts = state.latest.accounts || [];
  const query = state.accountQuery.toLowerCase();
  const filtered = accounts.filter(account => {
    const typeMatch = state.accountType === "全部" || account.type === state.accountType;
    const statusMatch = state.accountStatus === "全部" || account.status === state.accountStatus;
    const derived = `${accountFormat(account)} ${accountBorrowDimension(account)} ${accountServiceTarget(account)}`.toLowerCase();
    return typeMatch && statusMatch && `${searchable(account)} ${derived}`.includes(query);
  });

  elements.accountGrid.innerHTML = filtered.map(account => accountCard(account, accounts.indexOf(account))).join("");
  elements.accountEmpty.style.display = filtered.length ? "none" : "block";
  elements.accountGrid.querySelectorAll("[data-account-index]").forEach(element => {
    const open = () => openAccountDrawer(accounts[Number(element.dataset.accountIndex)]);
    element.addEventListener("click", open);
    element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function block(title, text, className = "") {
  if (!text) return "";
  return `<section class="analysis-block ${className}"><h4>${esc(title)}</h4><p>${esc(text)}</p></section>`;
}

function openTopicDrawer(topic, date) {
  elements.drawerContent.innerHTML = `
    <p class="drawer-kicker">${esc(date)} · ${esc(topic.category)} · ${esc(topic.source || "每日监测")} · 第${esc(topic.rank)}条</p>
    <h2>${esc(topic.title)}</h2>
    <div class="drawer-meta">
      <span class="tag">${esc(topic.ip)}</span>
      <span class="tag">${esc(recommendedSlot(topic))}</span>
      <span class="tag">${esc(topic.stage)}</span>
      <span class="tag">${esc(topic.priority)}</span>
    </div>
    <div class="source">
      <strong>原始样本</strong>
      <div>${esc(topic.account)}｜${esc(topic.video)}<br><a href="${esc(topic.url)}" target="_blank" rel="noopener">打开抖音原视频 ↗</a></div>
    </div>
    ${block("一句话推荐理由", recommendation(topic))}
    ${block("公开数据与热度依据", topic.heat)}
    ${block("目标客群", topic.audience)}
    ${block("客户真实痛点", topic.pain)}
    ${block("为什么会火或产生咨询", topic.logic)}
    ${block("建议改写角度", topic.angle)}
    ${block("推荐开头", topic.hook, "hook")}
    ${block("更适合的呈现方式", topic.format)}
    ${block("转化承接", topic.conversion)}
    ${block("IP形象与合规风险", topic.risk, "risk")}
    <div class="drawer-footer"><a class="primary-link" href="${esc(topic.url)}" target="_blank" rel="noopener">查看原视频</a></div>
  `;
  openDrawer();
}

function openAccountDrawer(account) {
  elements.drawerContent.innerHTML = `
    <p class="drawer-kicker">账号情报 · ${esc(account.observed)} · ${esc(account.source || "每日监测")}</p>
    <h2>${esc(account.name)}</h2>
    <div class="drawer-meta">
      <span class="tag">${esc(account.type)}</span>
      <span class="tag">${esc(account.status)}</span>
      <span class="tag">${esc(accountFormat(account))}</span>
    </div>
    ${block("内容领域", account.domain)}
    ${block("可借鉴维度", accountBorrowDimension(account))}
    ${block("适合服务的IP/账号", accountServiceTarget(account))}
    ${block("为什么关注", account.reason)}
    ${block("最近一次有效发现", account.movement)}
    ${block("代表选题", account.representative)}
    ${block("对我们的价值", account.value)}
    <div class="drawer-footer"><a class="primary-link" href="${esc(account.home)}" target="_blank" rel="noopener">打开账号主页</a></div>
  `;
  openDrawer();
}

function openDrawer() {
  document.body.classList.add("drawer-open");
  elements.drawer.setAttribute("aria-hidden", "false");
  elements.drawerClose.focus();
}

function closeDrawer() {
  document.body.classList.remove("drawer-open");
  elements.drawer.setAttribute("aria-hidden", "true");
}

function bindEvents() {
  elements.search.addEventListener("input", event => {
    state.query = event.target.value.trim();
    renderToday();
  });
  elements.filters.addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    elements.filters.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
    renderToday();
  });
  document.querySelector(".app-nav").addEventListener("click", event => {
    const button = event.target.closest(".nav-tab");
    if (!button) return;
    document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `view-${button.dataset.view}`));
  });
  elements.historyDates.addEventListener("click", async event => {
    const button = event.target.closest("[data-date]");
    if (!button) return;
    state.historyDate = button.dataset.date;
    renderHistoryDates();
    elements.historyContent.innerHTML = '<div class="signal-placeholder">正在读取该日期的选题…</div>';
    elements.historyEmpty.style.display = "none";
    try {
      await getDataset(state.historyDate);
      renderHistory();
    } catch (error) {
      elements.historyContent.innerHTML = `<div class="load-error">${esc(error.message)}</div>`;
    }
  });
  elements.historySearch.addEventListener("input", event => {
    state.historyQuery = event.target.value.trim();
    renderHistory();
  });
  elements.historyFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-history-filter]");
    if (!button) return;
    state.historyFilter = button.dataset.historyFilter;
    elements.historyFilters.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
    renderHistory();
  });
  elements.accountSearch.addEventListener("input", event => {
    state.accountQuery = event.target.value.trim();
    renderAccounts();
  });
  elements.accountTypeFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-account-type]");
    if (!button) return;
    state.accountType = button.dataset.accountType;
    renderAccountFilters();
    renderAccounts();
  });
  elements.accountStatusFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-account-status]");
    if (!button) return;
    state.accountStatus = button.dataset.accountStatus;
    renderAccountFilters();
    renderAccounts();
  });
  elements.drawerClose.addEventListener("click", closeDrawer);
  elements.backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDrawer();
  });
}

function cacheElements() {
  [
    "mastMeta", "summaryLabel", "coreJudgment", "selectionTitle", "selectionDetail",
    "competitionSignals", "topicRadar", "search", "filters", "content", "empty",
    "historyDates", "historySearch", "historyFilters", "historyContent", "historyEmpty",
    "accountSearch", "accountTypeFilters", "accountStatusFilters", "accountGrid", "accountEmpty",
    "backdrop", "drawer", "drawerClose", "drawerContent"
  ].forEach(id => { elements[id] = document.getElementById(id); });
}

function renderLoadError(error) {
  console.error(error);
  elements.coreJudgment.textContent = "数据读取失败，请通过网站地址或本地服务器打开页面。";
  elements.selectionDetail.textContent = error.message;
  elements.content.innerHTML = '<div class="load-error">未能读取 data/index.json。页面不再内嵌历史数据，因此直接使用 file:// 打开时可能被浏览器阻止。</div>';
}

async function init() {
  cacheElements();
  bindEvents();
  try {
    await loadData();
    renderMasthead();
    renderOverview();
    renderSignals();
    renderToday();
    renderHistoryDates();
    renderHistory();
    renderAccountFilters();
    renderAccounts();
  } catch (error) {
    renderLoadError(error);
  }
}

init();

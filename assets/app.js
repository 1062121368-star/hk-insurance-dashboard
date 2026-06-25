const TOPIC_CATEGORIES = ["钱放哪里", "钱留给什么目标", "港险怎么买、怎么用"];
const SOURCE_TYPES = ["真人专业型", "真人营销型", "图文资料型", "AI素材型"];
const ACCOUNT_STATUSES = ["全部", "核心监控", "重点跟踪", "选题参考", "新形式待观察"];

const DEFAULT_PYRAMID = {
  riskAwareness: {
    title: "风险感知入口",
    displayTitle: "环境变化下的钱放哪里",
    userState: "被政策、账户、汇率、银行安全感或资产安全变化触发，但还没有明确方案需求。",
    representativeTopics: ["银行卡冻结", "港卡开户", "美元资产", "CRS透明", "人民币贬值", "境外账户安全"],
    insuranceConnection: "先帮助用户意识到钱需要按用途、期限和风险隔离重新分层，不直接讲产品。",
    riskReminder: "人群较泛，需用资产门槛、长期资金用途和家庭目标过滤开卡、炒股及短期套利人群。"
  },
  fundArrangement: {
    title: "资金安排入口",
    displayTitle: "家庭目标下的钱怎么安排",
    userState: "手里已有明确资金，开始比较银行、理财、保险、投资、还贷和留现金等不同选择。",
    representativeTopics: ["50万怎么存", "100万怎么安排", "200万家庭资产分层", "退休现金流", "教育金", "家庭备用金"],
    insuranceConnection: "适合切入资金分层、持有期限、领取安排、确定性、家庭目标和美元长期账户。",
    riskReminder: "不能过早推产品，要先把钱的用途、期限和目标讲清楚。"
  },
  solutionComparison: {
    title: "方案比较入口",
    displayTitle: "港险方案到底怎么选",
    userState: "已经接触过港险或类似方案，正在比较适配、流动性、收益真实性和购买安全感。",
    representativeTopics: ["钱能不能拿回来", "前期退保会不会亏", "分红能否实现", "趸交还是分期", "计划书看什么", "不同方案为什么差很多"],
    insuranceConnection: "适合承接计划书解读、预算判断、方案对比、购买前避坑和一对一咨询。",
    riskReminder: "不能只讲产品优点，必须拆清适配条件、持有期限、退出成本和家庭目标。"
  }
};

const state = {
  index: null,
  datasets: new Map(),
  latest: null,
  todayCategory: "全部",
  todayType: "全部",
  query: "",
  historyDate: "",
  historyCategory: "全部",
  historyType: "全部",
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

function formatCnDate(date) {
  const [year, month, day] = String(date).split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function cleanTitleEdge(value) {
  return String(value || "")
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "")
    .replace(/[，,。；：\s]+$/g, "")
    .trim();
}

function normalizeDisplayText(value) {
  return cleanTitleEdge(value)
    .replace(/[“”‘’]/g, "")
    .replace(/(?:这种强观点题)?还有效$/u, "")
    .replace(/还在放量$/u, "")
    .replace(/题还能吸人$/u, "")
    .replace(/有热度$/u, "")
    .replace(/还能起量$/u, "")
    .replace(/还能跑$/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function inferTopicSubject(text) {
  const source = String(text || "");
  const subjectRules = [
    [/港卡/u, "港卡"],
    [/香港银行|银行开户|开户/u, "香港开户"],
    [/香港存钱|存香港|香港定存|定存/u, "香港存钱"],
    [/美元资产|美元/u, "美元资产"],
    [/教育金/u, "教育金"],
    [/婚前/u, "婚前资产"],
    [/养老|退休|现金流/u, "养老规划"],
    [/港险|储蓄险|保单/u, "港险"],
    [/中产/u, "中产资产配置"],
    [/离岸人民币|在岸人民币/u, "离岸人民币"],
  ];
  for (const [rule, label] of subjectRules) {
    if (rule.test(source)) return label;
  }
  return "";
}

function cleanVideoTitle(value) {
  return String(value || "")
    .replace(/^第\d+集\s*[|｜]\s*/u, "")
    .replace(/#\S+/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[|｜]\s*$/u, "")
    .trim();
}

function compactTopicTitle(topic) {
  const raw = String(
    topic?.displayTitle
    || topic?.shortTitle
    || topic?.compactTitle
    || topic?.title
    || topic?.video
    || ""
  ).trim();
  if (!raw) return "未命名选题";

  const normalized = raw
    .replace(/^\d{4}(?:年|[-/.])\d{1,2}(?:月|[-/.])\d{1,2}日?/u, "")
    .replace(/\s+/g, " ")
    .trim();

  const extractionRules = [
    /不是[“"'‘’](.+?)[”"'’][，,]\s*而是[“"'‘’](.+?)[”"'’]/u,
    /更有效的是[“"'‘’]?(.+?)[”"'’]?[，,]?\s*而不是/u,
    /(?:真正|更)(?:值得拍|值得借|该借|该拍|有价值|重要|能用的改写)的是[“"'‘’](.+?)[”"'’]/u,
    /(?:用户|大家)真(?:正)?(?:在问|想问)的是[“"'‘’](.+?)[”"'’]/u,
    /真正能承接的是[“"'‘’]?(.+?)[”"'’]?$/u,
    /适合承接[“"'‘’]?(.+?)[”"'’]?$/u,
    /必须补上(.+)$/u,
    /(?:改成|必须立刻接到)[“"'‘’](.+?)[”"'’]/u,
    /本质不是.+?[，,]\s*而是大家在找[“"'‘’](.+?)[”"'’]/u,
    /真正高意向的是(.+)$/u,
    /真正重要的是(.+)$/u,
    /用户要的不是.+?[，,]\s*是(.+)$/u,
  ];

  for (const rule of extractionRules) {
    const match = normalized.match(rule);
    if (!match) continue;
    const candidate = normalizeDisplayText(match[2] || match[1]);
    if (candidate) {
      const refined = candidate
        .replace(/办完以后/g, "办完后")
        .replace(/卡到手以后/g, "卡到手后")
        .replace(/这张卡到底/g, "这张卡")
        .replace(/到底/g, "")
        .replace(/，{2,}/g, "，")
        .trim();
      if (refined.length >= 6 && !/^(判断框架|信息差|口号|安全感表达|话术入口)$/u.test(refined)) {
        return refined;
      }
      const subject = inferTopicSubject(normalized);
      return subject ? `${subject}${refined}` : refined;
    }
  }

  const questionMatch = normalized.match(/^(.+?[？?])/u);
  if (questionMatch?.[1]) return normalizeDisplayText(questionMatch[1]);

  for (const marker of ["，但", "，这类题", "，这类", "，说明", "，今天还", "，今天更", "，今天已经", "，用户"]) {
    if (normalized.includes(marker)) return normalizeDisplayText(normalized.split(marker)[0]);
  }

  return normalizeDisplayText(normalized);
}

function topicDisplayTitle(topic) {
  return compactTopicTitle(topic);
}

function topicJudgment(topic) {
  const displayTitle = topicDisplayTitle(topic);
  const titleText = cleanTitleEdge(topic?.title || "");
  if (titleText && titleText !== displayTitle) return titleText;
  const logicText = cleanTitleEdge(topic?.logic || "");
  if (logicText && logicText !== displayTitle) return logicText;
  return "";
}

function topicSampleTitle(topic) {
  return cleanVideoTitle(topic?.video || "");
}

function normalizeAccountType(value) {
  const text = String(value || "").trim();
  if (!text) return "未分类";
  if (text === "真人专业型" || /真人专业|专业判断|专业顾问/.test(text)) return "真人专业型";
  if (text === "真人营销型" || /真人营销|营销导流|强钩子|营销口播/.test(text)) return "真人营销型";
  if (text === "图文资料型" || /图文|资料|清单|轮播|笔记/.test(text)) return "图文资料型";
  if (text === "AI素材型" || text === "AI/素材型" || /AI|素材|混剪|PPT|无人出镜/.test(text)) return "AI素材型";
  if (/真人|顾问|口播|实拍|对谈|固定机位|Vlog/.test(text)) return "真人专业型";
  return "未分类";
}

function sourceAccountType(topic, dataset) {
  const explicit = topic.sourceAccountType || topic.accountType || topic.sourceType;
  if (explicit) return normalizeAccountType(explicit);
  const accountPool = [...(dataset?.accounts || []), ...(state.latest?.accounts || [])];
  const matched = accountPool.find(account => account.name === topic.account);
  if (matched) return normalizeAccountType(matched.type);
  return normalizeAccountType(`${topic.format || ""} ${topic.video || ""}`);
}

function topicValueSignal(topic) {
  if (topic.valueSignal) return topic.valueSignal;
  const text = `${topic.heat || ""} ${topic.logic || ""}`;
  if (/粉丝|低粉|账号仅|账号体量|显著高于/.test(text)) return "低粉爆款 / 账号异动";
  if (/收藏/.test(text) && /分享/.test(text)) return "收藏分享信号";
  if (/评论/.test(text) && /咨询|追问|计划书|想买|参数/.test(text)) return "评论咨询信号";
  if (/图文|清单|流程|PPT|计算卡|结构/.test(`${text} ${topic.format || ""}`)) return "形式验证信号";
  if (/政策|CRS|监管|合规/.test(text)) return "风险议题信号";
  return "平台样本信号";
}

function operationObservation(topic) {
  return topic.operationObservation
    || topic.recommendation
    || topic.logic
    || topic.angle
    || "暂无观察";
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
    "AI素材型": "AI/素材画面 · 旁白栏目"
  };
  return formats[normalizeAccountType(account.type)] || "待观察的新形式";
}

function accountBorrowDimension(account) {
  return account.borrowDimension || account.value || account.reason || "选题与表达结构";
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
  state.historyDate = state.index.latest;
}

function renderMasthead() {
  document.title = `港险选题洞察看板｜${state.latest.date} ${state.latest.updatedAt}更新`;
  elements.mastMeta.innerHTML = `<strong>${formatCnDate(state.latest.date)} · ${esc(state.latest.updatedAt)}更新</strong>抖音公开搜索样本 · 港险内容选题情报库`;
}

function renderPyramid() {
  const pyramid = state.latest.pyramid || DEFAULT_PYRAMID;
  const levels = ["riskAwareness", "fundArrangement", "solutionComparison"];
  elements.pyramidLabel.textContent = `今日选题金字塔 · 采集日期 ${state.latest.date}`;
  elements.pyramidLevels.innerHTML = levels.map((key, index) => {
    const level = { ...DEFAULT_PYRAMID[key], ...(pyramid[key] || {}) };
    const topics = Array.isArray(level.representativeTopics) ? level.representativeTopics : [];
    return `
      <article class="pyramid-level pyramid-level-${index + 1}">
        <div class="pyramid-level-index">0${index + 1}</div>
        <div class="pyramid-level-body">
          <span class="pyramid-stage">${esc(level.title)}</span>
          <h3>${esc(level.displayTitle)}</h3>
          <dl>
            <div><dt>用户状态</dt><dd>${esc(level.userState)}</dd></div>
            <div><dt>代表话题</dt><dd>${topics.map(topic => `<span class="topic-chip">${esc(topic)}</span>`).join("") || "暂无"}</dd></div>
            <div><dt>港险连接</dt><dd>${esc(level.insuranceConnection)}</dd></div>
            <div><dt>风险提醒</dt><dd>${esc(level.riskReminder)}</dd></div>
          </dl>
        </div>
      </article>
    `;
  }).join("");
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

function matchesTopic(topic, dataset, category, sourceType, query) {
  const categoryMatch = category === "全部"
    || topic.category === category
    || (category === "动态专题" && String(topic.category).startsWith("专题｜"));
  const typeMatch = sourceType === "全部" || sourceAccountType(topic, dataset) === sourceType;
  const derived = `${sourceAccountType(topic, dataset)} ${topicValueSignal(topic)} ${operationObservation(topic)}`;
  return categoryMatch && typeMatch && `${searchable(topic)} ${derived}`.toLowerCase().includes(query.toLowerCase());
}

function renderTopicFilters(container, attribute, selected, values) {
  container.innerHTML = values.map(value => `
    <button class="filter ${value === selected ? "active" : ""}" ${attribute}="${esc(value)}">${esc(value)}</button>
  `).join("");
}

function renderTodayFilters() {
  const specials = (state.latest.topics || []).some(topic => String(topic.category).startsWith("专题｜"));
  renderTopicFilters(
    elements.todayCategoryFilters,
    "data-today-category",
    state.todayCategory,
    ["全部", ...TOPIC_CATEGORIES, ...(specials ? ["动态专题"] : [])]
  );
  renderTopicFilters(elements.todayTypeFilters, "data-today-type", state.todayType, ["全部", ...SOURCE_TYPES]);
}

function renderHistoryFilters(dataset) {
  const specials = (dataset?.topics || []).some(topic => String(topic.category).startsWith("专题｜"));
  renderTopicFilters(
    elements.historyCategoryFilters,
    "data-history-category",
    state.historyCategory,
    ["全部", ...TOPIC_CATEGORIES, ...(specials ? ["动态专题"] : [])]
  );
  renderTopicFilters(elements.historyTypeFilters, "data-history-type", state.historyType, ["全部", ...SOURCE_TYPES]);
}

function topicCard(topic, index, date, dataset) {
  const displayTitle = topicDisplayTitle(topic);
  const sampleTitle = topicSampleTitle(topic);
  const judgment = topicJudgment(topic);
  return `
    <article class="card intelligence-card" tabindex="0" data-topic-index="${index}" data-date="${esc(date)}">
      <div class="card-body">
        <div class="eyebrow">
          <span class="badge">${esc(topic.category || "未分类")}</span>
          <span class="tag">${esc(topic.account || "未知账号")}</span>
          <span class="tag">${esc(sourceAccountType(topic, dataset))}</span>
        </div>
        <span class="card-label">建议标题</span>
        <h3 title="${esc(topic.title || "未命名选题")}">${esc(displayTitle)}</h3>
        ${sampleTitle ? `<p class="video-caption"><strong>原视频标题</strong>${esc(sampleTitle)}</p>` : ""}
        <dl class="intelligence-grid">
          <div><dt>决策阶段</dt><dd>${esc(topic.stage || "暂无")}</dd></div>
          <div><dt>选题价值信号</dt><dd>${esc(topicValueSignal(topic))}</dd></div>
        </dl>
        ${judgment ? `<p class="title-analysis"><strong>入库判断</strong>${esc(judgment)}</p>` : ""}
        <p class="operation-observation"><strong>运营观察</strong>${esc(operationObservation(topic))}</p>
        <div class="card-bottom">
          ${topic.source === "临时洞察" ? '<span class="tag">临时洞察</span>' : ""}
          <span class="card-action">查看完整分析 →</span>
        </div>
      </div>
    </article>
  `;
}

function topicColumns(items, date, dataset) {
  const specials = [...new Set(items.map(topic => topic.category).filter(category => String(category).startsWith("专题｜")))];
  const categories = [...TOPIC_CATEGORIES.filter(category => items.some(topic => topic.category === category)), ...specials];
  const descriptions = {
    "钱放哪里": "账户、币种、地区与资产去向",
    "钱留给什么目标": "教育、养老、现金流与家庭任务",
    "港险怎么买、怎么用": "产品、计划书、领取与持单判断"
  };

  return `<div class="topic-columns">${categories.map(category => {
    const group = items.filter(topic => topic.category === category);
    return `
      <section class="topic-column">
        <div class="section-head">
          <h2>${esc(category)}</h2>
          <span>${esc(descriptions[category] || "当天形成平台信号的新问题")} · ${group.length}条</span>
        </div>
        <div class="grid">${group.map(topic => topicCard(topic, dataset.topics.indexOf(topic), date, dataset)).join("")}</div>
      </section>
    `;
  }).join("")}</div>`;
}

function bindTopicOpeners(root) {
  root.querySelectorAll("[data-topic-index]").forEach(element => {
    const open = () => {
      const dataset = state.datasets.get(element.dataset.date);
      openTopicDrawer(dataset.topics[Number(element.dataset.topicIndex)], element.dataset.date, dataset);
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
  const dataset = state.latest;
  const topics = dataset.topics || [];
  const filtered = topics.filter(topic => matchesTopic(topic, dataset, state.todayCategory, state.todayType, state.query));
  elements.content.innerHTML = topicColumns(filtered, state.index.latest, dataset);
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
  const filtered = topics.filter(topic => matchesTopic(
    topic,
    dataset,
    state.historyCategory,
    state.historyType,
    state.historyQuery
  ));
  renderHistoryFilters(dataset);

  elements.historyContent.innerHTML = filtered.length ? `
    <div class="history-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>日期</th><th>建议标题</th><th>话题分类</th><th>来源账号</th>
            <th>来源账号类型</th><th>决策阶段</th><th>选题价值信号</th><th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(topic => `
            <tr tabindex="0" data-topic-index="${topics.indexOf(topic)}" data-date="${esc(state.historyDate)}">
              <td>${esc(state.historyDate)}</td>
              <td class="history-title" title="${esc(topicJudgment(topic) || topic.title || "未命名选题")}">${esc(topicDisplayTitle(topic))}</td>
              <td>${esc(topic.category || "未分类")}</td>
              <td>${esc(topic.account || "未知账号")}</td>
              <td>${esc(sourceAccountType(topic, dataset))}</td>
              <td>${esc(topic.stage || "暂无")}</td>
              <td>${esc(topicValueSignal(topic))}</td>
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
          <span class="account-type">${esc(normalizeAccountType(account.type))}</span>
          <h3>${esc(account.name)}</h3>
        </div>
        <span class="account-status">${esc(account.status)}</span>
      </div>
      <dl class="account-summary">
        <div><dt>内容形态</dt><dd>${esc(accountFormat(account))}</dd></div>
        <div><dt>可借鉴维度</dt><dd>${esc(accountBorrowDimension(account))}</dd></div>
        <div><dt>内容领域</dt><dd>${esc(account.domain || "暂无")}</dd></div>
        <div><dt>最近有效发现</dt><dd>${esc(account.movement || "暂无观察")}</dd></div>
      </dl>
      <div class="account-card-footer">
        <span>${esc(account.observed)}</span>
        <span class="card-action">查看账号分析 →</span>
      </div>
    </article>
  `;
}

function renderAccountFilters() {
  renderTopicFilters(elements.accountTypeFilters, "data-account-type", state.accountType, ["全部", ...SOURCE_TYPES]);
  renderTopicFilters(elements.accountStatusFilters, "data-account-status", state.accountStatus, ACCOUNT_STATUSES);
}

function renderAccounts() {
  const accounts = state.latest.accounts || [];
  const query = state.accountQuery.toLowerCase();
  const filtered = accounts.filter(account => {
    const typeMatch = state.accountType === "全部" || normalizeAccountType(account.type) === state.accountType;
    const statusMatch = state.accountStatus === "全部" || account.status === state.accountStatus;
    const derived = `${normalizeAccountType(account.type)} ${accountFormat(account)} ${accountBorrowDimension(account)}`;
    return typeMatch && statusMatch && `${searchable(account)} ${derived}`.toLowerCase().includes(query);
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

function openTopicDrawer(topic, date, dataset) {
  const displayTitle = topicDisplayTitle(topic);
  const judgment = topicJudgment(topic);
  const sampleTitle = topicSampleTitle(topic);
  elements.drawerContent.innerHTML = `
    <p class="drawer-kicker">${esc(date)} · ${esc(topic.source || "每日监测")} · 第${esc(topic.rank || "—")}条</p>
    <h2>${esc(displayTitle)}</h2>
    <div class="drawer-meta">
      <span class="tag">${esc(topic.category || "未分类")}</span>
      <span class="tag">${esc(topic.account || "未知账号")}</span>
      <span class="tag">${esc(sourceAccountType(topic, dataset))}</span>
    </div>
    <div class="source">
      <strong>原视频来源</strong>
      <div><a href="${esc(topic.url)}" target="_blank" rel="noopener">打开抖音原视频 ↗</a></div>
    </div>
    ${block("建议标题", displayTitle)}
    ${sampleTitle ? block("原视频标题", sampleTitle) : ""}
    ${judgment ? block("入库判断", judgment) : ""}
    ${block("决策阶段", topic.stage || "暂无")}
    ${block("选题价值信号", topicValueSignal(topic))}
    ${block("运营观察", operationObservation(topic))}
    ${block("公开数据与热度依据", topic.heat || "暂无")}
    ${block("目标客群", topic.audience || "暂无")}
    ${block("客户真实痛点", topic.pain || "暂无")}
    ${block("为什么值得参考", topic.logic || "暂无")}
    ${block("如何转成港险选题", topic.migration || topic.angle || "暂无")}
    ${block("适合呈现形式", topic.format || "暂无")}
    ${block("转化承接方式", topic.conversion || "暂无")}
    ${block("合规风险", topic.risk || "暂无", "risk")}
    <div class="drawer-footer"><a class="primary-link" href="${esc(topic.url)}" target="_blank" rel="noopener">查看原视频</a></div>
  `;
  openDrawer();
}

function openAccountDrawer(account) {
  elements.drawerContent.innerHTML = `
    <p class="drawer-kicker">账号情报 · ${esc(account.observed)} · ${esc(account.source || "每日监测")}</p>
    <h2>${esc(account.name)}</h2>
    <div class="drawer-meta">
      <span class="tag">${esc(normalizeAccountType(account.type))}</span>
      <span class="tag">${esc(account.status)}</span>
      <span class="tag">${esc(accountFormat(account))}</span>
    </div>
    ${block("内容领域", account.domain)}
    ${block("可借鉴维度", accountBorrowDimension(account))}
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
  elements.todayCategoryFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-today-category]");
    if (!button) return;
    state.todayCategory = button.dataset.todayCategory;
    renderTodayFilters();
    renderToday();
  });
  elements.todayTypeFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-today-type]");
    if (!button) return;
    state.todayType = button.dataset.todayType;
    renderTodayFilters();
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
    state.historyCategory = "全部";
    state.historyType = "全部";
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
  elements.historyCategoryFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-history-category]");
    if (!button) return;
    state.historyCategory = button.dataset.historyCategory;
    renderHistory();
  });
  elements.historyTypeFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-history-type]");
    if (!button) return;
    state.historyType = button.dataset.historyType;
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
    "mastMeta", "pyramidLabel", "pyramidLevels", "competitionSignals", "topicRadar",
    "search", "todayCategoryFilters", "todayTypeFilters", "content", "empty",
    "historyDates", "historySearch", "historyCategoryFilters", "historyTypeFilters", "historyContent", "historyEmpty",
    "accountSearch", "accountTypeFilters", "accountStatusFilters", "accountGrid", "accountEmpty",
    "backdrop", "drawer", "drawerClose", "drawerContent"
  ].forEach(id => { elements[id] = document.getElementById(id); });
}

function renderLoadError(error) {
  console.error(error);
  elements.pyramidLevels.innerHTML = `<div class="load-error">${esc(error.message)}</div>`;
  elements.content.innerHTML = '<div class="load-error">未能读取 data/index.json。请通过网站地址或本地服务器打开页面。</div>';
}

async function init() {
  cacheElements();
  bindEvents();
  try {
    await loadData();
    renderMasthead();
    renderPyramid();
    renderSignals();
    renderTodayFilters();
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

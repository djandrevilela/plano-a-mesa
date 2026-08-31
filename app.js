/* ===========================================================
   Plano à Mesa — lógica da aplicação
   Os dados das receitas vivem em recipes.json (editável à vontade).
   O calendário é gerado automaticamente em BLOCOS de N dias
   (controlados pelo seletor "Cozinhar a cada"): cada bloco recebe
   uma combinação sopa+salada+prato para o almoço e outra, bem
   diferente, para o jantar. Com N pequeno (2-3 dias) há muito mais
   variedade ao longo da semana; com N=7 volta-se ao modelo de
   "cozinhar uma vez por semana".
   =========================================================== */

const MONTH_NAMES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const WEEKDAY_NAMES = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const BATCH_EPOCH = new Date(2020, 0, 1); // referência estável para o cálculo de blocos

let RECIPES = null;
let BASE_PEOPLE = 3;

const state = {
  viewMode: "calendar",
  refDate: startOfMonth(new Date()),   // âncora para a vista de calendário
  weekAnchor: startOfWeek(new Date()), // âncora para a vista de semana
  people: 3,
  batchDays: 2, // de quantos em quantos dias se cozinha
  selecting: false,
  selections: new Set() // chaves "YYYY-MM-DD|lunch" ou "YYYY-MM-DD|dinner"
};

/* ---------------- utilidades de data ---------------- */

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function startOfWeek(d) {
  const day = d.getDay(); // 0 = domingo
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0,0,0,0);
  return monday;
}

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

function dateKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function isSameDay(a,b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function mod(n, m) { return ((n % m) + m) % m; }

function batchIndexOf(d) {
  const diffDays = Math.round((d - BATCH_EPOCH) / 86400000);
  return Math.floor(diffDays / state.batchDays);
}

/* ---------------- geração do menu ----------------
   Cada bloco de "batchDays" dias tem um índice único (b). Esse
   índice avança por uma sequência quase-prima diferente em cada
   lista de receitas, para que sopa, salada e prato do almoço não
   mudem todos ao mesmo ritmo — e o jantar usa um deslocamento de
   "metade do ciclo" em cada lista, para se distinguir bem do
   almoço mesmo quando as listas têm tamanhos diferentes.
   -------------------------------------------------- */

function getMealsForDate(d) {
  const b = batchIndexOf(d);
  const { sopas, saladas, pratos } = RECIPES;
  const half = (n) => Math.floor(n / 2) || 1;

  const lunch = {
    sopa: sopas[mod(b, sopas.length)],
    salada: saladas[mod(b * 3, saladas.length)],
    prato: pratos[mod(b * 5, pratos.length)]
  };
  const dinner = {
    sopa: sopas[mod(b + half(sopas.length), sopas.length)],
    salada: saladas[mod(b * 3 + half(saladas.length), saladas.length)],
    prato: pratos[mod(b * 5 + half(pratos.length), pratos.length)]
  };
  return { lunch, dinner };
}

/* ---------------- formatação ---------------- */

function scaledQty(qtd) {
  if (qtd === null || qtd === undefined) return "q.b.";
  const factor = state.people / BASE_PEOPLE;
  let v = qtd * factor;
  v = Math.round(v * 10) / 10;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1).replace(/\.0$/, "");
}

function fmtIngredient(ing) {
  const qty = scaledQty(ing.qtd);
  return qty === "q.b." ? `${ing.nome} — q.b.` : `${qty} ${ing.unidade} de ${ing.nome}`;
}

/* ---------------- render: cabeçalho / navegação ---------------- */

function renderNavHeader() {
  const monthLabel = document.getElementById("monthLabel");
  const yearLabel = document.getElementById("yearLabel");

  if (state.viewMode === "calendar") {
    monthLabel.textContent = MONTH_NAMES[state.refDate.getMonth()];
    yearLabel.textContent = state.refDate.getFullYear();
  } else {
    const start = state.weekAnchor;
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    monthLabel.textContent = sameMonth
      ? `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[start.getMonth()]}`
      : `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
    yearLabel.textContent = start.getFullYear();
  }
}

function renderMonthJump() {
  const el = document.getElementById("monthJump");
  el.innerHTML = "";
  if (state.viewMode !== "calendar") return;

  const monthSelect = document.createElement("select");
  monthSelect.setAttribute("aria-label", "Escolher mês");
  MONTH_NAMES.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = m.charAt(0).toUpperCase() + m.slice(1);
    if (i === state.refDate.getMonth()) opt.selected = true;
    monthSelect.appendChild(opt);
  });
  monthSelect.addEventListener("change", () => {
    state.refDate = new Date(state.refDate.getFullYear(), Number(monthSelect.value), 1);
    renderAll();
  });

  const yearInput = document.createElement("input");
  yearInput.type = "number";
  yearInput.value = state.refDate.getFullYear();
  yearInput.style.width = "80px";
  yearInput.setAttribute("aria-label", "Ano");
  yearInput.addEventListener("change", () => {
    const y = parseInt(yearInput.value, 10);
    if (!isNaN(y)) {
      state.refDate = new Date(y, state.refDate.getMonth(), 1);
      renderAll();
    }
  });

  el.appendChild(monthSelect);
  el.appendChild(yearInput);
}

/* ---------------- render: vista de calendário ---------------- */

function renderWeekdayRow() {
  const row = document.getElementById("weekdayRow");
  row.innerHTML = WEEKDAY_NAMES.map(n => `<span>${n}</span>`).join("");
}

function mealSummaryLabel(meal) {
  return meal.prato.nome;
}

function makeDayMealEl(date, mealType, meal) {
  const div = document.createElement("div");
  div.className = `day-meal ${mealType}`;
  const key = `${dateKey(date)}|${mealType}`;
  if (state.selections.has(key)) div.classList.add("selected");

  const checkbox = document.createElement("span");
  checkbox.className = "select-checkbox";
  const tag = document.createElement("span");
  tag.className = "tag-label";
  tag.textContent = mealType === "lunch" ? "Almoço" : "Jantar";
  const label = document.createElement("span");
  label.textContent = mealSummaryLabel(meal);

  div.appendChild(checkbox);
  div.appendChild(tag);
  div.appendChild(label);

  div.addEventListener("click", () => {
    if (state.selecting) {
      toggleSelection(key);
      div.classList.toggle("selected", state.selections.has(key));
    } else {
      openMealModal(date, mealType, meal);
    }
  });

  return div;
}

function renderCalendarGrid() {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const year = state.refDate.getFullYear();
  const month = state.refDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // segunda = 0

  for (let i = 0; i < leadingBlanks; i++) {
    const blank = document.createElement("div");
    blank.className = "day-cell empty";
    grid.appendChild(blank);
  }

  const today = new Date();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (isSameDay(date, today)) cell.classList.add("today");

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = day;
    cell.appendChild(num);

    const meals = getMealsForDate(date);
    cell.appendChild(makeDayMealEl(date, "lunch", meals.lunch));
    cell.appendChild(makeDayMealEl(date, "dinner", meals.dinner));

    grid.appendChild(cell);
  }
}

/* ---------------- render: vista de semana ---------------- */

function renderWeekView() {
  const container = document.getElementById("weekColumns");
  container.innerHTML = "";

  const weekDayLabels = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];

  for (let i = 0; i < 7; i++) {
    const date = addDays(state.weekAnchor, i);
    const meals = getMealsForDate(date);

    const col = document.createElement("div");
    col.className = "week-col";

    const h3 = document.createElement("h3");
    h3.textContent = weekDayLabels[i];
    const sub = document.createElement("span");
    sub.className = "date-sub";
    sub.textContent = `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0,3)}`;
    col.appendChild(h3);
    col.appendChild(sub);

    [["lunch","Almoço",meals.lunch],["dinner","Jantar",meals.dinner]].forEach(([type,label,meal]) => {
      const block = document.createElement("div");
      block.className = `week-meal-block ${type}`;
      const lab = document.createElement("div");
      lab.className = "label";
      lab.textContent = label;
      const dish = document.createElement("div");
      dish.className = "dish";
      dish.textContent = mealSummaryLabel(meal);
      dish.addEventListener("click", () => openMealModal(date, type, meal));
      block.appendChild(lab);
      block.appendChild(dish);
      col.appendChild(block);
    });

    container.appendChild(col);
  }
}

/* ---------------- seleção de refeições ---------------- */

function toggleSelection(key) {
  if (state.selections.has(key)) state.selections.delete(key);
  else state.selections.add(key);
  updateSelectionBar();
}

function updateSelectionBar() {
  const bar = document.getElementById("selectionBar");
  const count = state.selections.size;
  document.getElementById("selectionCount").textContent =
    count === 1 ? "1 refeição selecionada" : `${count} refeições selecionadas`;
  bar.classList.toggle("hidden", !state.selecting || count === 0);
}

function setSelectingMode(on) {
  state.selecting = on;
  document.body.classList.toggle("selecting", on);
  document.getElementById("selectModeBtn").classList.toggle("active", on);
  document.getElementById("selectModeBtn").textContent = on ? "A selecionar…" : "Selecionar refeições";
  updateSelectionBar();
}

function selectWholeWeek(mealType) {
  for (let i = 0; i < 7; i++) {
    const date = addDays(state.weekAnchor, i);
    state.selections.add(`${dateKey(date)}|${mealType}`);
  }
  if (!state.selecting) setSelectingMode(true);
  else updateSelectionBar();
  renderAll();
}

/* ---------------- modal: detalhe da refeição ---------------- */

function courseBlockHTML(course, dish) {
  const badges = [];
  if (dish.saudavel) badges.push('<span class="meal-tag healthy">Saudável</span>');
  badges.push(`<span class="meal-tag time">${dish.tempo} min</span>`);

  const ingredientes = dish.ingredientes.map(ing =>
    `<li><span>${ing.nome}</span><span>${scaledQty(ing.qtd) === "q.b." ? "q.b." : scaledQty(ing.qtd) + " " + ing.unidade}</span></li>`
  ).join("");

  const passos = dish.preparo.map(p => `<li>${p}</li>`).join("");

  return `
    <div class="modal-course">${course}</div>
    <h3>${dish.nome}</h3>
    <div>${badges.join("")}</div>
    <p class="section-title">Ingredientes <span style="font-weight:400;color:var(--ink-soft);font-size:0.8rem;">(para ${state.people} pessoa${state.people===1?"":"s"})</span></p>
    <ul class="ingredient-list">${ingredientes}</ul>
    <p class="section-title">Modo de preparo</p>
    <ol class="steps-list">${passos}</ol>
  `;
}

function openMealModal(date, mealType, meal) {
  const body = document.getElementById("modalBody");
  const dateStr = date.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  const mealLabel = mealType === "lunch" ? "Almoço" : "Jantar";

  body.innerHTML = `
    <p class="section-title" style="margin-top:0;text-transform:capitalize;">${mealLabel} · ${dateStr}</p>
    ${courseBlockHTML("Sopa", meal.sopa)}
    <hr style="border:none;border-top:1px solid var(--line);margin:18px 0;">
    ${courseBlockHTML("Salada", meal.salada)}
    <hr style="border:none;border-top:1px solid var(--line);margin:18px 0;">
    ${courseBlockHTML("Prato", meal.prato)}
  `;
  document.getElementById("mealModal").classList.remove("hidden");
}

/* ---------------- lista de compras ---------------- */

const CATEGORY_RULES = [
  { cat: "Hortícolas & Fruta", words: ["tomate","cebola","alho","cenoura","couve","batata","curgete","pimento","alface","pepino","brócolos","abóbora","espinafre","ervilha","limão","beterraba","repolho","nabo","hortelã","salsa","coentro","milho","passas","gengibre","louro"] },
  { cat: "Proteína (peixe, carne, ovos)", words: ["bacalhau","frango","peixe","pescada","dourada","salmão","lula","atum","peru","vitela","porco","vaca","pato","ovo","chouriço","lombo","costeleta","bife"] },
  { cat: "Mercearia & Leguminosas", words: ["arroz","massa","grão","feijão","pão","quinoa"] },
  { cat: "Laticínios", words: ["leite","queijo","iogurte"] },
];

function categorize(nome) {
  const n = nome.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some(w => n.includes(w))) return rule.cat;
  }
  return "Outros & Temperos";
}

function buildShoppingList() {
  const merged = {};

  state.selections.forEach(key => {
    const [dStr, mealType] = key.split("|");
    const [y,m,d] = dStr.split("-").map(Number);
    const date = new Date(y, m-1, d);
    const meal = getMealsForDate(date)[mealType];

    ["sopa","salada","prato"].forEach(course => {
      meal[course].ingredientes.forEach(ing => {
        const k = ing.nome + "|" + ing.unidade;
        if (!merged[k]) merged[k] = { nome: ing.nome, unidade: ing.unidade, qtd: 0, hasQty: false };
        if (ing.qtd !== null) {
          merged[k].qtd += ing.qtd * (state.people / BASE_PEOPLE);
          merged[k].hasQty = true;
        }
      });
    });
  });

  return Object.values(merged).sort((a,b) => a.nome.localeCompare(b.nome, "pt"));
}

function openShoppingList() {
  const items = buildShoppingList();
  const groups = {};
  items.forEach(item => {
    const cat = categorize(item.nome);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  const order = ["Hortícolas & Fruta","Proteína (peixe, carne, ovos)","Mercearia & Leguminosas","Laticínios","Outros & Temperos"];

  let groupsHTML = "";
  order.forEach(cat => {
    if (!groups[cat]) return;
    groupsHTML += `<div class="shopping-group"><h4>${cat}</h4><ul class="shopping-list">`;
    groups[cat].forEach(item => {
      const qtyLabel = item.hasQty ? `${Math.round(item.qtd*10)/10} ${item.unidade}` : "q.b.";
      groupsHTML += `<li><input type="checkbox"><span>${item.nome}</span><span class="qty">${qtyLabel}</span></li>`;
    });
    groupsHTML += `</ul></div>`;
  });

  const body = document.getElementById("shoppingBody");
  body.innerHTML = `
    <p class="section-title" style="margin-top:0;">Lista de compras</p>
    <p class="shopping-summary">${state.selections.size} refeições selecionadas · para ${state.people} pessoa${state.people===1?"":"s"}</p>
    ${groupsHTML || "<p>Sem refeições selecionadas.</p>"}
    <div class="shopping-actions">
      <button class="btn btn-primary" id="printListBtn">Imprimir / Guardar PDF</button>
    </div>
  `;

  body.querySelectorAll(".shopping-list li").forEach(li => {
    li.addEventListener("click", (e) => {
      if (e.target.tagName !== "INPUT") {
        const cb = li.querySelector("input");
        cb.checked = !cb.checked;
      }
      li.classList.toggle("checked", li.querySelector("input").checked);
    });
  });

  document.getElementById("printListBtn").addEventListener("click", () => window.print());

  document.getElementById("shoppingModal").classList.remove("hidden");
}

function updateWeekHint() {
  const el = document.getElementById("weekHint");
  if (!el) return;
  const n = state.batchDays;
  if (n === 1) {
    el.textContent = "A cozinhar todos os dias — máxima variedade, sem sobras para congelar.";
  } else if (n === 7) {
    el.textContent = "A cozinhar uma vez por semana — mesmo almoço e mesmo jantar de segunda a domingo.";
  } else {
    el.textContent = `A cozinhar de ${n} em ${n} dias — cada bloco de dias traz sopa, salada e prato novos.`;
  }
}

/* ---------------- render geral ---------------- */

function renderAll() {
  renderNavHeader();
  renderMonthJump();
  if (state.viewMode === "calendar") {
    document.getElementById("calendarView").classList.add("active");
    document.getElementById("weekView").classList.remove("active");
    renderWeekdayRow();
    renderCalendarGrid();
  } else {
    document.getElementById("weekView").classList.add("active");
    document.getElementById("calendarView").classList.remove("active");
    renderWeekView();
  }
}

/* ---------------- ligação de eventos ---------------- */

function bindEvents() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    if (state.viewMode === "calendar") state.refDate = addMonths(state.refDate, -1);
    else state.weekAnchor = addDays(state.weekAnchor, -7);
    renderAll();
  });
  document.getElementById("nextMonth").addEventListener("click", () => {
    if (state.viewMode === "calendar") state.refDate = addMonths(state.refDate, 1);
    else state.weekAnchor = addDays(state.weekAnchor, 7);
    renderAll();
  });

  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected","false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-selected","true");
      state.viewMode = btn.dataset.view;
      if (state.viewMode === "week") state.weekAnchor = startOfWeek(state.refDate);
      renderAll();
    });
  });

  document.getElementById("peopleCount").addEventListener("input", (e) => {
    const v = parseInt(e.target.value, 10);
    state.people = (!isNaN(v) && v > 0) ? v : state.people;
  });

  document.getElementById("batchDays").addEventListener("change", (e) => {
    state.batchDays = parseInt(e.target.value, 10);
    updateWeekHint();
    renderAll();
  });

  document.getElementById("selectModeBtn").addEventListener("click", () => {
    setSelectingMode(!state.selecting);
  });

  document.getElementById("clearSelectionBtn").addEventListener("click", () => {
    state.selections.clear();
    updateSelectionBar();
    renderAll();
  });

  document.getElementById("generateListBtn").addEventListener("click", openShoppingList);

  document.getElementById("selectWeekLunch").addEventListener("click", () => selectWholeWeek("lunch"));
  document.getElementById("selectWeekDinner").addEventListener("click", () => selectWholeWeek("dinner"));

  document.getElementById("modalClose").addEventListener("click", () => {
    document.getElementById("mealModal").classList.add("hidden");
  });
  document.getElementById("mealModal").addEventListener("click", (e) => {
    if (e.target.id === "mealModal") e.currentTarget.classList.add("hidden");
  });

  document.getElementById("shoppingClose").addEventListener("click", () => {
    document.getElementById("shoppingModal").classList.add("hidden");
  });
  document.getElementById("shoppingModal").addEventListener("click", (e) => {
    if (e.target.id === "shoppingModal") e.currentTarget.classList.add("hidden");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.getElementById("mealModal").classList.add("hidden");
      document.getElementById("shoppingModal").classList.add("hidden");
    }
  });
}

/* ---------------- arranque ---------------- */

async function init() {
  try {
    const res = await fetch("recipes.json");
    RECIPES = await res.json();
    BASE_PEOPLE = RECIPES.baseParaPessoas || 3;
  } catch (err) {
    document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;max-width:520px;margin:0 auto;">
      <h2>Não foi possível carregar receitas.json</h2>
      <p>Se abriu este ficheiro diretamente (file://), o browser bloqueia a leitura do JSON por segurança.
      Publique a pasta no GitHub Pages ou sirva-a com um servidor local (ex: <code>python3 -m http.server</code>) e volte a tentar.</p>
    </div>`;
    return;
  }
  bindEvents();
  updateWeekHint();
  renderAll();
}

init();

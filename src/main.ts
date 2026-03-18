import './style.css'

type Expense = {
  id: string
  title: string
  amount: number
  category: string
  date: string
  note: string
}

type PresetCategory = {
  label: string
  color: string
}

type MonthGroup = {
  key: string
  label: string
  total: number
  count: number
  items: Expense[]
}

type ViewKey = 'overview' | 'add' | 'categories' | 'months'

const STORAGE_KEY = 'campus-cashflow-expenses'
const VIEW_KEY = 'campus-cashflow-view'

const presetCategories: PresetCategory[] = [
  { label: 'Food', color: '#d97706' },
  { label: 'Transport', color: '#0f766e' },
  { label: 'Study', color: '#2563eb' },
  { label: 'Entertainment', color: '#db2777' },
  { label: 'Bills', color: '#7c3aed' },
  { label: 'Shopping', color: '#0891b2' },
  { label: 'Health', color: '#65a30d' },
  { label: 'Other', color: '#64748b' },
]

const views: Array<{ key: ViewKey; label: string; desc: string }> = [
  { key: 'overview', label: 'Overview', desc: 'Summary and recent expenses' },
  { key: 'add', label: 'Add Expense', desc: 'Create a new expense entry' },
  { key: 'categories', label: 'Categories', desc: 'Pie chart and category share' },
  { key: 'months', label: 'Monthly Details', desc: 'December, January and more' },
]

const starterExpenses: Expense[] = [
  {
    id: crypto.randomUUID(),
    title: 'Canteen lunch',
    amount: 140,
    category: 'Food',
    date: isoDaysAgo(1),
    note: 'Quick meal after class',
  },
  {
    id: crypto.randomUUID(),
    title: 'Bus pass recharge',
    amount: 500,
    category: 'Transport',
    date: isoDaysAgo(4),
    note: 'Monthly campus travel',
  },
  {
    id: crypto.randomUUID(),
    title: 'Project printouts',
    amount: 220,
    category: 'Study',
    date: isoDaysAgo(12),
    note: 'Assignment submission',
  },
  {
    id: crypto.randomUUID(),
    title: 'Phone recharge',
    amount: 299,
    category: 'Bills',
    date: isoDaysAgo(38),
    note: '',
  },
  {
    id: crypto.randomUUID(),
    title: 'Movie night',
    amount: 650,
    category: 'Entertainment',
    date: isoDaysAgo(45),
    note: 'Weekend outing',
  },
  {
    id: crypto.randomUUID(),
    title: 'Stationery set',
    amount: 180,
    category: 'Study',
    date: isoDaysAgo(71),
    note: '',
  },
]

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root not found')
}

const root = app

let expenses = loadExpenses()
let currentView = loadView()
let isMenuOpen = false

render()

function render() {
  const stats = buildStats(expenses)
  const activeView = views.find((view) => view.key === currentView) || views[0]

  root.innerHTML = `
    <main class="app-shell">
      <button
        class="backdrop ${isMenuOpen ? 'is-open' : ''}"
        id="menu-backdrop"
        aria-label="Close menu"
        type="button"
      ></button>

      <aside class="sidebar ${isMenuOpen ? 'is-open' : ''}">
        <div class="sidebar-top">
          <p class="eyebrow">Campus Cashflow</p>
          <h2>Expense Pages</h2>
          <button class="menu-close" id="menu-close" type="button" aria-label="Close menu">x</button>
        </div>

        <nav class="nav-list">
          ${views
            .map(
              (view) => `
                <button
                  class="nav-item ${view.key === currentView ? 'is-active' : ''}"
                  type="button"
                  data-view="${view.key}"
                >
                  <strong>${view.label}</strong>
                  <span>${view.desc}</span>
                </button>
              `,
            )
            .join('')}
        </nav>

        <button class="ghost-button sidebar-demo" id="seed-demo" type="button">Load sample data</button>
      </aside>

      <section class="content-shell">
        <header class="topbar">
          <div class="topbar-left">
            <button class="menu-toggle" id="menu-toggle" type="button" aria-label="Open menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div>
              <p class="eyebrow">Student Expense Tracker</p>
              <h1>${activeView.label}</h1>
            </div>
          </div>

          <div class="topbar-summary">
            <div class="summary-pill">
              <span>This month</span>
              <strong>Rs ${formatCurrency(stats.currentMonthTotal)}</strong>
            </div>
            <div class="summary-pill">
              <span>Top category</span>
              <strong>${escapeHtml(stats.topCategory.name)}</strong>
            </div>
          </div>
        </header>

        ${renderView(currentView, stats)}
      </section>
    </main>
  `

  bindEvents()
}

function renderView(view: ViewKey, stats: ReturnType<typeof buildStats>) {
  if (view === 'add') {
    return `
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">New Expense</p>
          <h2>Add an expense without crowding the whole dashboard.</h2>
          <p class="lede">Use this page just for entries. Category and monthly reports stay on their own pages.</p>
        </div>
        <div class="hero-card">
          <p>Quick info</p>
          <strong>${stats.monthGroups.length ? escapeHtml(stats.monthGroups[0].label) : 'No data'}</strong>
          <span>${stats.monthGroups.length ? `${stats.monthGroups[0].count} expenses in latest month` : 'No expenses yet'}</span>
        </div>
      </section>

      <section class="single-column">
        <article class="panel panel-form">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">Form</p>
              <h2>Add what you spent</h2>
            </div>
          </div>

          <form id="expense-form" class="expense-form">
            <label>
              <span>Expense title</span>
              <input name="title" type="text" maxlength="50" placeholder="Mess dinner, recharge, notebooks..." required />
            </label>

            <div class="field-row">
              <label>
                <span>Amount</span>
                <input name="amount" type="number" min="1" step="1" placeholder="250" required />
              </label>
              <label>
                <span>Date</span>
                <input name="date" type="date" value="${todayIso()}" required />
              </label>
            </div>

            <div class="field-row">
              <label>
                <span>Category</span>
                <select name="category">
                  ${presetCategories.map((category) => `<option value="${category.label}">${category.label}</option>`).join('')}
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label id="custom-category-wrap" class="is-hidden">
                <span>Custom category</span>
                <input name="customCategory" type="text" maxlength="24" placeholder="Gym, rent, trip..." />
              </label>
            </div>

            <label>
              <span>Quick note</span>
              <textarea name="note" rows="3" maxlength="100" placeholder="Optional note"></textarea>
            </label>

            <button class="primary-button" type="submit">Save expense</button>
          </form>
        </article>
      </section>
    `
  }

  if (view === 'categories') {
    return `
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Category Analysis</p>
          <h2>See exactly where most of your money goes.</h2>
          <p class="lede">This page focuses only on category-wise analysis, so the pie chart and category ranking are easier to read.</p>
        </div>
        <div class="hero-card">
          <p>Top spend</p>
          <strong>${escapeHtml(stats.topCategory.name)}</strong>
          <span>Rs ${formatCurrency(stats.topCategory.amount)}</span>
        </div>
      </section>

      <section class="single-column">
        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">Pie Chart</p>
              <h2>Where you spend more</h2>
            </div>
          </div>

          <div class="pie-layout">
            <div class="pie-card">
              <div class="pie-chart" style="background:${stats.pieGradient}" aria-label="Expense category pie chart"></div>
              <div class="pie-center">
                <span>Total spent</span>
                <strong>Rs ${formatCurrency(stats.totalSpent)}</strong>
              </div>
            </div>

            <div class="legend-list">
              ${stats.categoryRows
                .map(
                  (row) => `
                    <div class="legend-row">
                      <div class="legend-title">
                        <span class="legend-dot" style="background:${row.color}"></span>
                        <strong>${escapeHtml(row.name)}</strong>
                      </div>
                      <div class="legend-values">
                        <span>Rs ${formatCurrency(row.amount)}</span>
                        <span>${row.percent}%</span>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        </article>
      </section>
    `
  }

  if (view === 'months') {
    return `
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Monthly Details</p>
          <h2>Separate pages feel, with each month shown clearly.</h2>
          <p class="lede">Review December details, January details, and each month’s expenses without the rest of the dashboard getting in the way.</p>
        </div>
        <div class="hero-card">
          <p>Logged months</p>
          <strong>${stats.monthGroups.length}</strong>
          <span>Total months with expense records</span>
        </div>
      </section>

      <section class="single-column">
        <article class="panel monthly-details-panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">By Month</p>
              <h2>Monthly expense details</h2>
            </div>
          </div>

          <div class="monthly-groups">
            ${
              stats.monthGroups.length
                ? stats.monthGroups
                    .map(
                      (group) => `
                        <section class="month-group">
                          <div class="month-group-head">
                            <div>
                              <h3>${escapeHtml(group.label)}</h3>
                              <p>${group.count} expenses logged</p>
                            </div>
                            <strong>Rs ${formatCurrency(group.total)}</strong>
                          </div>
                          <div class="month-group-items">
                            ${group.items
                              .map(
                                (expense) => `
                                  <div class="month-detail-item">
                                    <div>
                                      <strong>${escapeHtml(expense.title)}</strong>
                                      <p>${escapeHtml(expense.category)} - ${formatPrettyDate(expense.date)}</p>
                                      ${expense.note ? `<span class="note-text">${escapeHtml(expense.note)}</span>` : ''}
                                    </div>
                                    <strong>Rs ${formatCurrency(expense.amount)}</strong>
                                  </div>
                                `,
                              )
                              .join('')}
                          </div>
                        </section>
                      `,
                    )
                    .join('')
                : '<p class="empty-state">No monthly details yet. Add expenses to create monthly sections.</p>'
            }
          </div>
        </article>
      </section>
    `
  }

  return `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Overview</p>
        <h2>A cleaner home page with only the main summary.</h2>
        <p class="lede">This page keeps the essential cards and recent activity, while the menu sends you to separate pages for categories and month-wise details.</p>
      </div>
      <div class="hero-card">
        <p>Quick view</p>
        <strong>${stats.monthGroups.length ? escapeHtml(stats.monthGroups[0].label) : 'No data'}</strong>
        <span>${stats.monthGroups.length ? `${stats.monthGroups[0].count} expenses logged` : 'Add your first expense to begin'}</span>
        <div class="hero-line"></div>
        <span>Total overall spend</span>
        <strong>Rs ${formatCurrency(stats.totalSpent)}</strong>
      </div>
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Overview</p>
            <h2>Monthly summary</h2>
          </div>
        </div>

        <div class="metric-grid">
          <div class="metric-card">
            <span>This month</span>
            <strong>Rs ${formatCurrency(stats.currentMonthTotal)}</strong>
            <p>${stats.currentMonthCount} expenses</p>
          </div>
          <div class="metric-card">
            <span>Previous month</span>
            <strong>Rs ${formatCurrency(stats.previousMonthTotal)}</strong>
            <p>${stats.previousMonthCount} expenses</p>
          </div>
          <div class="metric-card">
            <span>Average month</span>
            <strong>Rs ${formatCurrency(stats.averageMonthlySpend)}</strong>
            <p>Across logged months</p>
          </div>
          <div class="metric-card">
            <span>Spent most on</span>
            <strong>${escapeHtml(stats.topCategory.name)}</strong>
            <p>Rs ${formatCurrency(stats.topCategory.amount)}</p>
          </div>
        </div>

        <div class="month-summary-list">
          ${stats.monthGroups
            .map(
              (group) => `
                <div class="month-summary-row">
                  <div>
                    <strong>${escapeHtml(group.label)}</strong>
                    <p>${group.count} expenses</p>
                  </div>
                  <div class="month-summary-meta">
                    <strong>Rs ${formatCurrency(group.total)}</strong>
                    <div class="month-bar">
                      <div class="month-bar-fill" style="width: ${monthWidth(group.total, stats.maxMonthSpend)}%"></div>
                    </div>
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Latest Entries</p>
            <h2>Recent expenses</h2>
          </div>
        </div>

        <div class="expense-list">
          ${
            stats.recentExpenses.length
              ? stats.recentExpenses
                  .map(
                    (expense) => `
                      <div class="expense-item">
                        <div>
                          <strong>${escapeHtml(expense.title)}</strong>
                          <p>${escapeHtml(expense.category)} - ${formatPrettyDate(expense.date)}</p>
                        </div>
                        <div class="expense-meta">
                          <strong>Rs ${formatCurrency(expense.amount)}</strong>
                          <button class="delete-button" type="button" data-id="${expense.id}">Delete</button>
                        </div>
                      </div>
                    `,
                  )
                  .join('')
              : '<p class="empty-state">No expenses yet. Add one to start tracking.</p>'
          }
        </div>
      </article>
    </section>
  `
}

function bindEvents() {
  const form = document.querySelector<HTMLFormElement>('#expense-form')
  const categorySelect = document.querySelector<HTMLSelectElement>('select[name="category"]')
  const customCategoryWrap = document.querySelector<HTMLElement>('#custom-category-wrap')
  const customCategoryInput = document.querySelector<HTMLInputElement>('input[name="customCategory"]')
  const seedButton = document.querySelector<HTMLButtonElement>('#seed-demo')
  const deleteButtons = document.querySelectorAll<HTMLButtonElement>('.delete-button')
  const navButtons = document.querySelectorAll<HTMLButtonElement>('.nav-item')
  const menuToggle = document.querySelector<HTMLButtonElement>('#menu-toggle')
  const menuClose = document.querySelector<HTMLButtonElement>('#menu-close')
  const backdrop = document.querySelector<HTMLButtonElement>('#menu-backdrop')

  menuToggle?.addEventListener('click', () => {
    isMenuOpen = true
    render()
  })

  menuClose?.addEventListener('click', () => {
    isMenuOpen = false
    render()
  })

  backdrop?.addEventListener('click', () => {
    isMenuOpen = false
    render()
  })

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view as ViewKey
      currentView = view
      isMenuOpen = false
      saveView(view)
      render()
    })
  })

  categorySelect?.addEventListener('change', () => {
    const isCustom = categorySelect.value === 'Custom'
    customCategoryWrap?.classList.toggle('is-hidden', !isCustom)
    if (!isCustom && customCategoryInput) {
      customCategoryInput.value = ''
    }
  })

  form?.addEventListener('submit', (event) => {
    event.preventDefault()

    const formData = new FormData(form)
    const title = String(formData.get('title') || '').trim()
    const amount = Number(formData.get('amount'))
    const date = String(formData.get('date') || todayIso())
    const selectedCategory = String(formData.get('category') || 'Other')
    const customCategory = String(formData.get('customCategory') || '').trim()
    const note = String(formData.get('note') || '').trim()
    const category = selectedCategory === 'Custom' ? customCategory : selectedCategory

    if (!title || !amount || amount <= 0 || !category) {
      return
    }

    expenses = [
      {
        id: crypto.randomUUID(),
        title,
        amount,
        category,
        date,
        note,
      },
      ...expenses,
    ]

    saveExpenses(expenses)
    form.reset()

    const dateInput = form.querySelector<HTMLInputElement>('input[name="date"]')
    if (dateInput) {
      dateInput.value = todayIso()
    }

    customCategoryWrap?.classList.add('is-hidden')
    currentView = 'overview'
    saveView(currentView)
    render()
  })

  seedButton?.addEventListener('click', () => {
    expenses = starterExpenses
    saveExpenses(expenses)
    render()
  })

  deleteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id
      expenses = expenses.filter((expense) => expense.id !== id)
      saveExpenses(expenses)
      render()
    })
  })
}

function buildStats(entries: Expense[]) {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
  const totalSpent = sum(entries.map((entry) => entry.amount))
  const monthGroups = buildMonthGroups(sorted)
  const categoryRows = buildCategoryRows(entries, totalSpent)
  const pieGradient = buildPieGradient(categoryRows)
  const topCategory = categoryRows[0] || { name: 'No data', amount: 0, percent: 0, color: '#cbd5e1' }
  const currentMonthKey = monthKey(todayIso())
  const previousMonthKey = monthKey(previousMonthIso())
  const currentMonth = monthGroups.find((group) => group.key === currentMonthKey)
  const previousMonth = monthGroups.find((group) => group.key === previousMonthKey)
  const averageMonthlySpend = monthGroups.length ? sum(monthGroups.map((group) => group.total)) / monthGroups.length : 0

  return {
    totalSpent,
    monthGroups,
    maxMonthSpend: Math.max(...monthGroups.map((group) => group.total), 1),
    categoryRows,
    pieGradient,
    topCategory,
    totalEntries: entries.length,
    currentMonthTotal: currentMonth?.total || 0,
    currentMonthCount: currentMonth?.count || 0,
    previousMonthTotal: previousMonth?.total || 0,
    previousMonthCount: previousMonth?.count || 0,
    averageMonthlySpend,
    recentExpenses: sorted.slice(0, 6),
  }
}

function buildMonthGroups(entries: Expense[]): MonthGroup[] {
  const grouped = new Map<string, MonthGroup>()

  entries.forEach((entry) => {
    const key = monthKey(entry.date)
    const existing = grouped.get(key)

    if (existing) {
      existing.total += entry.amount
      existing.count += 1
      existing.items.push(entry)
      return
    }

    grouped.set(key, {
      key,
      label: formatMonthLabel(entry.date),
      total: entry.amount,
      count: 1,
      items: [entry],
    })
  })

  return Array.from(grouped.values()).sort((a, b) => (a.key < b.key ? 1 : -1))
}

function buildCategoryRows(entries: Expense[], totalSpent: number) {
  const grouped = new Map<string, number>()

  entries.forEach((entry) => {
    const key = normalizeCategory(entry.category)
    grouped.set(key, (grouped.get(key) || 0) + entry.amount)
  })

  const rows = Array.from(grouped.entries())
    .map(([name, amount], index) => ({
      name,
      amount,
      percent: totalSpent ? Math.round((amount / totalSpent) * 100) : 0,
      color: categoryColor(name, index),
    }))
    .sort((a, b) => b.amount - a.amount)

  return rows.length ? rows : [{ name: 'No data', amount: 0, percent: 0, color: '#cbd5e1' }]
}

function buildPieGradient(rows: Array<{ percent: number; color: string }>) {
  if (!rows.length || rows.every((row) => row.percent === 0)) {
    return 'conic-gradient(#e2e8f0 0 100%)'
  }

  let start = 0
  const segments = rows.map((row, index) => {
    const isLast = index === rows.length - 1
    const end = isLast ? 100 : Math.min(start + row.percent, 100)
    const segment = `${row.color} ${start}% ${end}%`
    start = end
    return segment
  })

  return `conic-gradient(${segments.join(', ')})`
}

function loadExpenses() {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Expense[]
    return parsed.filter(
      (entry) =>
        typeof entry.id === 'string' &&
        typeof entry.title === 'string' &&
        typeof entry.amount === 'number' &&
        typeof entry.category === 'string' &&
        typeof entry.date === 'string',
    )
  } catch {
    return []
  }
}

function saveExpenses(entries: Expense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function loadView(): ViewKey {
  const stored = localStorage.getItem(VIEW_KEY)
  return views.some((view) => view.key === stored) ? (stored as ViewKey) : 'overview'
}

function saveView(view: ViewKey) {
  localStorage.setItem(VIEW_KEY, view)
}

function categoryColor(name: string, index: number) {
  const preset = presetCategories.find((category) => category.label.toLowerCase() === name.toLowerCase())
  if (preset) {
    return preset.color
  }

  const fallback = ['#d97706', '#2563eb', '#0f766e', '#7c3aed', '#db2777', '#0891b2']
  return fallback[index % fallback.length]
}

function normalizeCategory(value: string) {
  return value.trim() || 'Other'
}

function monthWidth(value: number, maxValue: number) {
  return Math.max(10, Math.round((value / maxValue) * 100))
}

function monthKey(date: string) {
  return date.slice(0, 7)
}

function previousMonthIso() {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.toISOString().slice(0, 10)
}

function formatMonthLabel(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function formatPrettyDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(value))
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function isoDaysAgo(daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

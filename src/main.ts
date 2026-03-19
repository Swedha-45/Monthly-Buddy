import './style.css'

type Expense = {
  id: string
  title: string
  amount: number
  category: string
  date: string
  note: string
}

type Income = {
  id: string
  source: string
  amount: number
  date: string
  note: string
  relatedLentId?: string
}

type Lent = {
  id: string
  person: string
  amount: number
  date: string
  receivedBack: boolean
  dateReceivedBack: string
  note: string
}

type ViewKey =
  | 'overview'
  | 'add-expense'
  | 'expenses'
  | 'add-income'
  | 'income'
  | 'add-lent'
  | 'lent'
  | 'receiving'

const STORAGE_KEY = 'campus-cashflow-expenses'
const INCOME_STORAGE_KEY = 'campus-cashflow-income'
const LENT_STORAGE_KEY = 'campus-cashflow-lent'
const VIEW_KEY = 'campus-cashflow-view'

const categories = ['Food', 'Transport', 'Study', 'Bills', 'Shopping', 'Health', 'Other']

const views: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: 'overview', label: 'Dashboard', hint: 'Only the main summary' },
  { key: 'add-expense', label: 'Add Expense', hint: 'Save a new spending entry' },
  { key: 'expenses', label: 'Expenses', hint: 'See all expense records' },
  { key: 'add-income', label: 'Add Income', hint: 'Save received money' },
  { key: 'income', label: 'Income', hint: 'See all received entries' },
  { key: 'add-lent', label: 'Add Lent', hint: 'Add money you gave' },
  { key: 'lent', label: 'Lent Checklist', hint: 'Mark returned or pending' },
  { key: 'receiving', label: 'Receiving', hint: 'Only returned money' },
]

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root not found')
}

let expenses = loadExpenses()
let income = loadIncome()
let lent = loadLent()
let currentView = loadView()

syncIncomeFromLent()
render()

function render() {
  const stats = buildExpenseStats(expenses)
  const incomeStats = buildIncomeStats(income)
  const lentStats = buildLentStats(lent)
  const activeView = views.find((view) => view.key === currentView) || views[0]

  app!.innerHTML = `
    <main class="app-shell">
      <aside class="sidebar">
        <div class="brand-block">
          <p class="brand-kicker">Money Tracker</p>
          <h1>Simple daily tracking</h1>
          <p class="brand-copy">Less clutter, faster updates, and a separate receiving page.</p>
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
                  <span>${view.hint}</span>
                </button>
              `,
            )
            .join('')}
        </nav>
      </aside>

      <section class="content-shell">
        <section class="page-head">
          <div>
            <p class="section-kicker">Current Page</p>
            <h2>${activeView.label}</h2>
          </div>
          <p class="page-note">${activeView.hint}</p>
        </section>

        ${renderView(currentView, stats, incomeStats, lentStats)}
      </section>
    </main>
  `

  bindEvents()
}

function renderView(
  view: ViewKey,
  stats: ReturnType<typeof buildExpenseStats>,
  incomeStats: ReturnType<typeof buildIncomeStats>,
  lentStats: ReturnType<typeof buildLentStats>,
) {
  if (view === 'add-expense') {
    return `
      <section class="panel form-panel">
        <div class="panel-head">
          <div>
            <p class="section-kicker">New Entry</p>
            <h3>Add expense</h3>
          </div>
        </div>

        <form id="expense-form" class="entry-form">
          <label>
            <span>Title</span>
            <input name="title" type="text" maxlength="50" placeholder="Lunch, recharge, notebook..." required />
          </label>

          <div class="split-fields">
            <label>
              <span>Amount</span>
              <input name="amount" type="number" min="1" step="1" placeholder="250" required />
            </label>
            <label>
              <span>Date</span>
              <input name="date" type="date" value="${todayIso()}" required />
            </label>
          </div>

          <div class="split-fields">
            <label>
              <span>Category</span>
              <select name="category">
                ${categories.map((category) => `<option value="${category}">${category}</option>`).join('')}
              </select>
            </label>
            <label>
              <span>Note</span>
              <input name="note" type="text" maxlength="100" placeholder="Optional" />
            </label>
          </div>

          <button class="primary-button" type="submit">Save expense</button>
        </form>
      </section>
    `
  }

  if (view === 'expenses') {
    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <p class="section-kicker">Expense List</p>
            <h3>All expenses</h3>
          </div>
          <strong class="panel-total">Rs ${formatCurrency(stats.total)}</strong>
        </div>

        <div class="record-list">
          ${
            stats.items.length
              ? stats.items
                  .map(
                    (item) => `
                      <article class="record-card">
                        <div class="record-main">
                          <strong>${escapeHtml(item.title)}</strong>
                          <p>${escapeHtml(item.category)} - ${formatPrettyDate(item.date)}</p>
                          ${item.note ? `<span class="record-note">${escapeHtml(item.note)}</span>` : ''}
                        </div>
                        <div class="record-side">
                          <strong>Rs ${formatCurrency(item.amount)}</strong>
                          <button class="danger-button" type="button" data-expense-id="${item.id}">Delete</button>
                        </div>
                      </article>
                    `,
                  )
                  .join('')
              : '<p class="empty-state">No expenses added yet.</p>'
          }
        </div>
      </section>
    `
  }

  if (view === 'add-income') {
    return `
      <section class="panel form-panel">
        <div class="panel-head">
          <div>
            <p class="section-kicker">New Entry</p>
            <h3>Add income</h3>
          </div>
        </div>

        <form id="income-form" class="entry-form">
          <label>
            <span>Source</span>
            <input name="source" type="text" maxlength="50" placeholder="Pocket money, refund..." required />
          </label>

          <div class="split-fields">
            <label>
              <span>Amount</span>
              <input name="amount" type="number" min="1" step="1" placeholder="1000" required />
            </label>
            <label>
              <span>Date</span>
              <input name="date" type="date" value="${todayIso()}" required />
            </label>
          </div>

          <label>
            <span>Note</span>
            <input name="note" type="text" maxlength="100" placeholder="Optional" />
          </label>

          <button class="primary-button" type="submit">Save income</button>
        </form>
      </section>
    `
  }

  if (view === 'income') {
    return `
      <section class="stack-grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="section-kicker">Income Split</p>
              <h3>Income pie chart</h3>
            </div>
            <strong class="panel-total">Rs ${formatCurrency(incomeStats.total)}</strong>
          </div>

          <div class="chart-layout">
            <div class="pie-card">
              <div class="pie-chart" style="background:${incomeStats.pieGradient}"></div>
              <div class="pie-center">
                <span>Total</span>
                <strong>Rs ${formatCurrency(incomeStats.total)}</strong>
              </div>
            </div>

            <div class="record-list compact-list">
              ${
                incomeStats.sourceRows.length
                  ? incomeStats.sourceRows
                      .map(
                        (row) => `
                          <article class="legend-row">
                            <div class="legend-main">
                              <span class="legend-dot" style="background:${row.color}"></span>
                              <strong>${escapeHtml(row.name)}</strong>
                            </div>
                            <div class="legend-values">
                              <span>Rs ${formatCurrency(row.amount)}</span>
                              <span>${row.percent}%</span>
                            </div>
                          </article>
                        `,
                      )
                      .join('')
                  : '<p class="empty-state">No income categories yet.</p>'
              }
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="section-kicker">Income List</p>
              <h3>All income</h3>
            </div>
          </div>

          <div class="record-list">
            ${
              incomeStats.items.length
                ? incomeStats.items
                    .map(
                      (item) => `
                        <article class="record-card">
                          <div class="record-main">
                            <strong>${escapeHtml(item.source)}</strong>
                            <p>${formatPrettyDate(item.date)}</p>
                            ${item.note ? `<span class="record-note">${escapeHtml(item.note)}</span>` : ''}
                          </div>
                          <div class="record-side">
                            <strong>Rs ${formatCurrency(item.amount)}</strong>
                            ${
                              item.relatedLentId
                                ? '<span class="status-text">Added from lent</span>'
                                : `<button class="danger-button" type="button" data-income-id="${item.id}">Delete</button>`
                            }
                          </div>
                        </article>
                      `,
                    )
                    .join('')
                : '<p class="empty-state">No income added yet.</p>'
            }
          </div>
        </section>
      </section>
    `
  }

  if (view === 'add-lent') {
    return `
      <section class="panel form-panel">
        <div class="panel-head">
          <div>
            <p class="section-kicker">New Entry</p>
            <h3>Add lent amount</h3>
          </div>
        </div>

        <form id="lent-form" class="entry-form">
          <label>
            <span>Person</span>
            <input name="person" type="text" maxlength="50" placeholder="Friend name" required />
          </label>

          <div class="split-fields">
            <label>
              <span>Amount</span>
              <input name="amount" type="number" min="1" step="1" placeholder="500" required />
            </label>
            <label>
              <span>Date given</span>
              <input name="date" type="date" value="${todayIso()}" required />
            </label>
          </div>

          <label class="check-row">
            <input name="receivedBack" type="checkbox" />
            <span>Already received back</span>
          </label>

          <label>
            <span>Note</span>
            <input name="note" type="text" maxlength="100" placeholder="Optional" />
          </label>

          <button class="primary-button" type="submit">Save lent entry</button>
        </form>
      </section>
    `
  }

  if (view === 'lent') {
    return `
      <section class="stack-grid">
        <section class="card-strip">
          <article class="mini-card">
            <span>Pending</span>
            <strong>Rs ${formatCurrency(lentStats.pendingAmount)}</strong>
          </article>
          <article class="mini-card">
            <span>Returned</span>
            <strong>Rs ${formatCurrency(lentStats.returnedAmount)}</strong>
          </article>
          <article class="mini-card">
            <span>Total Given</span>
            <strong>Rs ${formatCurrency(lentStats.total)}</strong>
          </article>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="section-kicker">Checklist</p>
              <h3>Money lent</h3>
            </div>
          </div>

          <div class="record-list">
            ${
              lentStats.items.length
                ? lentStats.items
                    .map(
                      (item) => `
                        <article class="record-card checklist-card ${item.receivedBack ? 'is-complete' : ''}">
                          <label class="checklist-main">
                            <input
                              class="status-checkbox"
                              type="checkbox"
                              data-lent-id="${item.id}"
                              ${item.receivedBack ? 'checked' : ''}
                            />
                            <div>
                              <strong>${escapeHtml(item.person)}</strong>
                              <p>Given on ${formatPrettyDate(item.date)}</p>
                              ${item.note ? `<span class="record-note">${escapeHtml(item.note)}</span>` : ''}
                            </div>
                          </label>
                          <div class="record-side">
                            <strong>Rs ${formatCurrency(item.amount)}</strong>
                            <span class="status-text">${item.receivedBack ? 'Received' : 'Pending'}</span>
                            <button class="danger-button" type="button" data-lent-delete-id="${item.id}">Delete</button>
                          </div>
                        </article>
                      `,
                    )
                    .join('')
                : '<p class="empty-state">No lent entries added yet.</p>'
            }
          </div>
        </section>
      </section>
    `
  }

  if (view === 'receiving') {
    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <p class="section-kicker">Receiving Menu</p>
            <h3>Returned money</h3>
          </div>
          <strong class="panel-total">Rs ${formatCurrency(lentStats.returnedAmount)}</strong>
        </div>

        <div class="record-list">
          ${
            lentStats.returned.length
              ? lentStats.returned
                  .map(
                    (item) => `
                      <article class="record-card is-complete">
                        <div class="record-main">
                          <strong>${escapeHtml(item.person)}</strong>
                          <p>Given ${formatPrettyDate(item.date)}</p>
                          <span class="record-note">Received back ${formatPrettyDate(item.dateReceivedBack)}</span>
                        </div>
                        <div class="record-side">
                          <strong>Rs ${formatCurrency(item.amount)}</strong>
                          <button class="danger-button" type="button" data-lent-delete-id="${item.id}">Delete</button>
                        </div>
                      </article>
                    `,
                  )
                  .join('')
              : '<p class="empty-state">Nothing received back yet.</p>'
          }
        </div>
      </section>
    `
  }

  return `
    <section class="stack-grid">
      <section class="card-strip">
        <article class="mini-card">
          <span>Total Expense</span>
          <strong>Rs ${formatCurrency(stats.total)}</strong>
        </article>
        <article class="mini-card">
          <span>Total Income</span>
          <strong>Rs ${formatCurrency(incomeStats.total)}</strong>
        </article>
        <article class="mini-card">
          <span>Balance</span>
          <strong>Rs ${formatCurrency(incomeStats.total - stats.total)}</strong>
        </article>
        <article class="mini-card">
          <span>Lent Pending</span>
          <strong>Rs ${formatCurrency(lentStats.pendingAmount)}</strong>
        </article>
      </section>

      <section class="dashboard-triple">
        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="section-kicker">Category Split</p>
              <h3>Expense pie chart</h3>
            </div>
          </div>

          <div class="chart-layout">
            <div class="pie-card">
              <div class="pie-chart" style="background:${stats.pieGradient}"></div>
              <div class="pie-center">
                <span>Total</span>
                <strong>Rs ${formatCurrency(stats.total)}</strong>
              </div>
            </div>

            <div class="record-list compact-list">
              ${
                stats.categoryRows.length
                  ? stats.categoryRows
                      .map(
                        (row) => `
                          <article class="legend-row">
                            <div class="legend-main">
                              <span class="legend-dot" style="background:${row.color}"></span>
                              <strong>${escapeHtml(row.name)}</strong>
                            </div>
                            <div class="legend-values">
                              <span>Rs ${formatCurrency(row.amount)}</span>
                              <span>${row.percent}%</span>
                            </div>
                          </article>
                        `,
                      )
                      .join('')
                  : '<p class="empty-state">No expense categories yet.</p>'
              }
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="section-kicker">Month Wise</p>
              <h3>Monthly transactions</h3>
            </div>
          </div>

          <div class="record-list">
            ${
              stats.monthGroups.length
                ? stats.monthGroups
                    .map(
                      (group) => `
                        <article class="month-card">
                          <div class="month-head">
                            <div>
                              <strong>${escapeHtml(group.label)}</strong>
                              <p>${group.items.length} transactions</p>
                            </div>
                            <strong>Rs ${formatCurrency(group.total)}</strong>
                          </div>

                          <div class="month-items">
                            ${group.items
                              .map(
                                (item) => `
                                  <div class="month-item">
                                    <div class="record-main">
                                      <strong>${escapeHtml(item.title)}</strong>
                                      <p>${escapeHtml(item.category)} - ${formatPrettyDate(item.date)}</p>
                                    </div>
                                    <strong>Rs ${formatCurrency(item.amount)}</strong>
                                  </div>
                                `,
                              )
                              .join('')}
                          </div>
                        </article>
                      `,
                    )
                    .join('')
                : '<p class="empty-state">No monthly transactions yet.</p>'
            }
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="section-kicker">Recent Activity</p>
              <h3>Latest items</h3>
            </div>
          </div>

          <div class="dashboard-duo">
            <div class="sub-panel">
              <h4>Recent expenses</h4>
              <div class="record-list compact-list">
                ${
                  stats.items.length
                    ? stats.items
                        .slice(0, 5)
                        .map(
                          (item) => `
                            <article class="record-card compact-card">
                              <div class="record-main">
                                <strong>${escapeHtml(item.title)}</strong>
                                <p>${formatPrettyDate(item.date)}</p>
                              </div>
                              <strong>Rs ${formatCurrency(item.amount)}</strong>
                            </article>
                          `,
                        )
                        .join('')
                    : '<p class="empty-state">No expenses yet.</p>'
                }
              </div>
            </div>

            <div class="sub-panel">
              <h4>Lent checklist</h4>
              <div class="record-list compact-list">
                ${
                  lentStats.items.length
                    ? lentStats.items
                        .slice(0, 5)
                        .map(
                          (item) => `
                            <article class="record-card compact-card ${item.receivedBack ? 'is-complete' : ''}">
                              <div class="record-main">
                                <strong>${escapeHtml(item.person)}</strong>
                                <p>${item.receivedBack ? 'Received back' : 'Pending'}</p>
                              </div>
                              <strong>Rs ${formatCurrency(item.amount)}</strong>
                            </article>
                          `,
                        )
                        .join('')
                    : '<p class="empty-state">No lent entries yet.</p>'
                }
              </div>
            </div>
          </div>
        </section>
      </section>
    </section>
  `
}

function bindEvents() {
  const expenseForm = document.querySelector<HTMLFormElement>('#expense-form')
  const incomeForm = document.querySelector<HTMLFormElement>('#income-form')
  const lentForm = document.querySelector<HTMLFormElement>('#lent-form')

  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view as ViewKey
      saveView(currentView)
      render()
    })
  })

  expenseForm?.addEventListener('submit', (event) => {
    event.preventDefault()

    const formData = new FormData(expenseForm)
    const title = String(formData.get('title') || '').trim()
    const amount = Number(formData.get('amount'))
    const category = String(formData.get('category') || 'Other')
    const date = String(formData.get('date') || todayIso())
    const note = String(formData.get('note') || '').trim()

    if (!title || !amount || amount <= 0) {
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
    currentView = 'expenses'
    saveView(currentView)
    render()
  })

  incomeForm?.addEventListener('submit', (event) => {
    event.preventDefault()

    const formData = new FormData(incomeForm)
    const source = String(formData.get('source') || '').trim()
    const amount = Number(formData.get('amount'))
    const date = String(formData.get('date') || todayIso())
    const note = String(formData.get('note') || '').trim()

    if (!source || !amount || amount <= 0) {
      return
    }

    income = [
      {
        id: crypto.randomUUID(),
        source,
        amount,
        date,
        note,
      },
      ...income,
    ]

    saveIncome(income)
    currentView = 'income'
    saveView(currentView)
    render()
  })

  lentForm?.addEventListener('submit', (event) => {
    event.preventDefault()

    const formData = new FormData(lentForm)
    const person = String(formData.get('person') || '').trim()
    const amount = Number(formData.get('amount'))
    const date = String(formData.get('date') || todayIso())
    const note = String(formData.get('note') || '').trim()
    const receivedBack = formData.get('receivedBack') === 'on'

    if (!person || !amount || amount <= 0) {
      return
    }

    lent = [
      createLentEntry({
        id: crypto.randomUUID(),
        person,
        amount,
        date,
        note,
        receivedBack,
      }),
      ...lent,
    ]

    saveLent(lent)
    syncIncomeFromLent()
    currentView = receivedBack ? 'receiving' : 'lent'
    saveView(currentView)
    render()
  })

  document.querySelectorAll<HTMLInputElement>('.status-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const id = checkbox.dataset.lentId
      const item = lent.find((entry) => entry.id === id)

      if (!item) {
        return
      }

      item.receivedBack = checkbox.checked
      item.dateReceivedBack = checkbox.checked ? todayIso() : ''
      saveLent(lent)
      syncIncomeFromLent()
      render()
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-expense-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.expenseId
      expenses = expenses.filter((entry) => entry.id !== id)
      saveExpenses(expenses)
      render()
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-income-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.incomeId
      income = income.filter((entry) => entry.id !== id)
      saveIncome(income)
      render()
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-lent-delete-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.lentDeleteId
      lent = lent.filter((entry) => entry.id !== id)
      saveLent(lent)
      syncIncomeFromLent()
      render()
    })
  })
}

function buildExpenseStats(entries: Expense[]) {
  const items = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
  const total = sum(items.map((item) => item.amount))
  const categoryRows = buildCategoryRows(items, total)

  return {
    items,
    total,
    categoryRows,
    pieGradient: buildPieGradient(categoryRows),
    monthGroups: buildMonthGroups(items),
  }
}

function buildIncomeStats(entries: Income[]) {
  const items = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
  const total = sum(items.map((item) => item.amount))
  const sourceRows = buildBreakdownRows(
    items.map((item) => ({ name: item.source.trim() || 'Other', amount: item.amount })),
    total,
  )

  return {
    items,
    total,
    sourceRows,
    pieGradient: buildPieGradient(sourceRows),
  }
}

function buildLentStats(entries: Lent[]) {
  const items = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
  const returned = items.filter((item) => item.receivedBack)
  const pending = items.filter((item) => !item.receivedBack)

  return {
    items,
    returned,
    pending,
    total: sum(items.map((item) => item.amount)),
    returnedAmount: sum(returned.map((item) => item.amount)),
    pendingAmount: sum(pending.map((item) => item.amount)),
  }
}

function buildMonthGroups(entries: Expense[]) {
  const grouped = new Map<string, { key: string; label: string; total: number; items: Expense[] }>()

  entries.forEach((entry) => {
    const key = entry.date.slice(0, 7)
    const existing = grouped.get(key)

    if (existing) {
      existing.total += entry.amount
      existing.items.push(entry)
      return
    }

    grouped.set(key, {
      key,
      label: formatMonthLabel(entry.date),
      total: entry.amount,
      items: [entry],
    })
  })

  return Array.from(grouped.values()).sort((a, b) => (a.key < b.key ? 1 : -1))
}

function buildCategoryRows(entries: Expense[], total: number) {
  return buildBreakdownRows(
    entries.map((entry) => ({ name: entry.category.trim() || 'Other', amount: entry.amount })),
    total,
  )
}

function buildBreakdownRows(entries: Array<{ name: string; amount: number }>, total: number) {
  const grouped = new Map<string, number>()

  entries.forEach((entry) => {
    grouped.set(entry.name, (grouped.get(entry.name) || 0) + entry.amount)
  })

  return Array.from(grouped.entries())
    .map(([name, amount], index) => ({
      name,
      amount,
      percent: total ? Math.round((amount / total) * 100) : 0,
      color: categoryColor(name, index),
    }))
    .sort((a, b) => b.amount - a.amount)
}

function buildPieGradient(rows: Array<{ percent: number; color: string }>) {
  if (!rows.length) {
    return 'conic-gradient(#eadfce 0 100%)'
  }

  let start = 0
  const segments = rows.map((row, index) => {
    const end = index === rows.length - 1 ? 100 : Math.min(start + row.percent, 100)
    const segment = `${row.color} ${start}% ${end}%`
    start = end
    return segment
  })

  return `conic-gradient(${segments.join(', ')})`
}

function categoryColor(name: string, index: number) {
  const fixedColors: Record<string, string> = {
    Food: '#d97706',
    Transport: '#0f766e',
    Study: '#2563eb',
    Bills: '#7c3aed',
    Shopping: '#b45309',
    Health: '#65a30d',
    Other: '#64748b',
  }

  if (fixedColors[name]) {
    return fixedColors[name]
  }

  const fallback = ['#c96f2d', '#0f766e', '#2563eb', '#9a3412', '#4d7c0f', '#7c3aed']
  return fallback[index % fallback.length]
}

function createLentEntry(entry: Omit<Lent, 'dateReceivedBack'> & { dateReceivedBack?: string }) {
  return {
    ...entry,
    dateReceivedBack: entry.receivedBack ? entry.dateReceivedBack || todayIso() : '',
  }
}

function syncIncomeFromLent() {
  const manualIncome = income.filter((entry) => !entry.relatedLentId)
  const lentIncome = lent
    .filter((entry) => entry.receivedBack)
    .map((entry) => ({
      id: existingIncomeIdForLent(entry.id) || crypto.randomUUID(),
      source: `Returned from ${entry.person}`,
      amount: entry.amount,
      date: entry.dateReceivedBack || todayIso(),
      note: entry.note ? `Lent return: ${entry.note}` : 'Lent money received back',
      relatedLentId: entry.id,
    }))

  income = [...lentIncome, ...manualIncome].sort((a, b) => (a.date < b.date ? 1 : -1))
  saveIncome(income)
}

function existingIncomeIdForLent(lentId: string) {
  return income.find((entry) => entry.relatedLentId === lentId)?.id || ''
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

function loadIncome() {
  const raw = localStorage.getItem(INCOME_STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Income[]
    return parsed.filter(
      (entry) =>
        typeof entry.id === 'string' &&
        typeof entry.source === 'string' &&
        typeof entry.amount === 'number' &&
        typeof entry.date === 'string' &&
        (typeof entry.relatedLentId === 'undefined' || typeof entry.relatedLentId === 'string'),
    )
  } catch {
    return []
  }
}

function saveIncome(entries: Income[]) {
  localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(entries))
}

function loadLent() {
  const raw = localStorage.getItem(LENT_STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Lent[]
    return parsed.filter(
      (entry) =>
        typeof entry.id === 'string' &&
        typeof entry.person === 'string' &&
        typeof entry.amount === 'number' &&
        typeof entry.date === 'string' &&
        typeof entry.receivedBack === 'boolean',
    )
  } catch {
    return []
  }
}

function saveLent(entries: Lent[]) {
  localStorage.setItem(LENT_STORAGE_KEY, JSON.stringify(entries))
}

function loadView(): ViewKey {
  const stored = localStorage.getItem(VIEW_KEY)
  return views.some((view) => view.key === stored) ? (stored as ViewKey) : 'overview'
}

function saveView(view: ViewKey) {
  localStorage.setItem(VIEW_KEY, view)
}

function formatPrettyDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMonthLabel(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(value))
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function todayIso() {
  return localIso(new Date())
}

function localIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

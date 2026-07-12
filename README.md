Pocketbook — Complete App Audit (Mobile UI Focus)

  0. What the app is, in one paragraph

  Pocketbook is an INR-first personal-finance PWA built on Next.js 16 + React 19 + MongoDB (Mongoose) + Auth.js v5. The philosophy is commitment isolation, not transaction logging — the app tracks the money you've
  promised elsewhere (Fixed) separately from the money still in play (Variable), and the headline metric on every surface is Free Cash = Income − Fixed − Variable. Money is stored as integer paise, dates are
  UTC-midnight, paid/overdue/upcoming/skipped/inactive/ended are computed from a pure billing engine (never stored), and every action returns {ok, data|error} never throws. All fonts, colors, tokens, safe-area
  handling, view transitions, and gestures are tuned for a phone.                                                                                                                                   

  Tech stack: Next.js 16 (App Router, ViewTransition), TanStack Query (30s stale, no refetch-on-focus), React Hook Form + Zod, Radix primitives + hand-built wrappers, Recharts, date-fns, Sonner toasts (offset above
  tab bar + FAB), next-themes, bcryptjs (12 rounds), server-only guard, Tailwind v4, Vitest for pure-logic tests.

  ---
  1. Global Mobile Shell (app/(app)/layout.tsx → AppShell)
  
  Every logged-in route renders inside this shell. Mobile layout is a single-column stack with safe-area padding on all sides.

  1.1 Top of viewport

  - OfflineBanner (z-50): fixed top strip "You're offline · viewing last-seen data" with a CloudOff icon; auto-hides on reconnect; respects --safe-top.
  - SwUpdateToast (z-40): "A new version is available · Refresh" appears when a new service worker installs. Refresh posts SKIP_WAITING, waits for controllerchange, then reloads.
  - StatusBarShield: paints a strip matching the theme color behind the iOS status bar in standalone PWA mode so it doesn't look like a floating notch.

  1.2 Bottom of viewport

  - MobileTabBar (fixed, lg:hidden, z-30): 5 tabs — Dashboard, Fixed, Variable, Income, More. The active tab shows a thin --accent-colored underline at the top edge; icon scales 1.05× and thickens (strokeWidth 2.4 
  vs 1.8). Height 56px + --safe-bottom padding for the iOS home indicator. Auto-hides when the app enters bulk-select mode (listens to pocketbook:select-mode).
  - More opens MobileMoreSheet (bottom sheet) with:
    - Links: Insights, Savings, Categories, Settings (each with active state + chevron)
    - Theme toggle inline
    - Calm mode switch (blurs currency amounts app-wide via .calm-amounts .pb-amount { filter: blur() })
    - Density radio (Cozy / Compact — tightens .pb-card and .pb-list-row padding)
    - User card (name + email) + sign-out button
  - GlobalQuickLog FAB (fixed bottom-right, z-30): 48×48 accent-filled circle with a + icon. Bottom position = calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 0.75rem). Tap opens a sheet — NumpadQuickLog on
  phone (thumb-optimized), VariableQuickAdd compact form on desktop. Hidden during bulk-select. Also opens when N is pressed or the pocketbook:open-quick-log event fires.
  - IosInstallHint: dismissible banner "Install Pocketbook: tap Share, then Add to Home Screen" — shows only on iOS Safari (excludes FB/IG/Line webviews), hides once installed or dismissed; dismissal persisted to
  localStorage.

  1.3 View transitions
  
  Wraps <main> in Next.js <ViewTransition> with nav-forward / nav-back classes tied to TAB_ORDER (/dashboard=0, /fixed=1, /variable=2, /income=3, /savings|/categories|/settings=4). directionFromTo(from, to) decides
  which direction to slide — pb-slide-from-left|right with a 56px offset on mobile. Same-tab or off-tab-order navigation gets no animation.

  1.4 Keyboard shortcuts (desktop but present)

  - / focuses the first search input
  - n focuses the quick-add amount, or opens the FAB sheet if not on a page with one
  - g then d|f|v|i|c|s navigates (1.5s arm timeout)
  - Ignored while typing in inputs / textareas / contenteditable

  1.5 Desktop-only aside

  On lg: a 240px sidebar shows brand, TabNav, theme toggle, and UserMenu. Not part of the mobile audit.

  ---
  2. Authentication Pages
  
  2.1 /auth/login — LoginForm

  - Fields: email (trimmed/lowercased), password. React Hook Form + Zod.
  - Calls signIn("credentials", ...) — generic error "Email or password is incorrect" (no user enumeration).
  - On success: router.push(safeReturnTo) + router.refresh(). safeReturnTo sanitizes to prevent open-redirect; default /variable.

  2.2 /auth/signup — SignupForm + signupAction

  - Fields: name, email, password.
  - Server action checks email uniqueness → returns EMAIL_TAKEN on duplicate. On success, auto-signs in via credentials; falls back to /auth/login if that fails.
  - Passwords hashed with bcrypt (12 rounds) in the User model.

  2.3 Sign-out — SignOutDialog + signOutAndClearCaches()

  - Confirm dialog first; on confirm, posts CLEAR_CACHES to the service worker before signOut → prevents cached HTML/RSC from previous user leaking to next. Redirects to /auth/login.
  
  ---
  3. /dashboard — the "Now Zone"
  
  Server-rendered core payload (fetchDashboardCore) hydrates the hero cards instantly; heavy charts (monthlyBreakdowns, dailySpend, lifestyleInflation) lazy-load via useDashboardCharts (React Query, 60s stale, 5m
  cache-time). Layout: linear stack on mobile, 2-col at md, bento grid at lg. Cards stagger-fade in via .rise-in (480ms cubic).

  3.1 Pull-to-refresh — DashboardPullToRefresh
  
  iOS-style; renders an invisible puck fixed to top that follows the drag with rubber-band damping. Threshold 80px. On release: invalidates ["dashboard"] and calls router.refresh(). Disabled while offline, when a
  dialog/sheet/menu is open, or with prefers-reduced-motion.

  3.2 DashboardNowZone — the top block

  - Page header ("Dashboard" + "Today's spend: ₹X")
  - SpendingClimatePill — one-word ambient badge: Surplus / Steady / Brisk / Tight, classified from projected end-of-month free cash vs. income and vs. 6-month variable average
  - FreeCashCard — HERO. Big Fraunces display number (green if positive, red if negative), subtitle ("X still due this month" or "All bills settled"), projection warning ("runs out ~Mar 24" or "On track"), 6-month
  sparkline. Long-press the hero reveals a LongPressBreakdown sheet: Income − Fixed − Variable = Free Cash.
  - RemainingCard — end-of-month projection at current variable pace, red if negative
  - SavingsCard — total balance + this-month delta + goal progress. Named-goals mode: stacked segmented bar (one segment per goal proportional to target) + top-3 goals list with % complete. Legacy mode: single
  linear bar + target date + pace.
  - UpcomingDeductionsCard — next 3 fixed renewals due this month, sorted by date, with "See calendar →" to /insights. Auto-hides when empty.
  - ActionInboxCard — up to 4 actionable alerts: overdue count, auto-debit rows needing confirm, month-end surplus ready to sweep (opens SplitSweepDialog), month shortfall with "Cover from savings" button, income
  variance windfall. Confetti on successful sweep.

  3.3 PacingGroup (collapsible; state in localStorage pocketbook:dashboard-pacing-open-v1)

  Summary line computed by computePacingSummary() — "Running hot · ₹500/day · income +12%" or "Easing off" or "On track"; income-variance suffix included when there is a baseline. Contains:
  - IncomeVarianceCard — three modes: (a) no baseline → "Set your baseline in Settings" link, (b) variance ≤ 0 → null, (c) variance > 0 → amount + "Move to savings" (single button if one goal, dropdown if many).
  Calls sweepIncomeVarianceAction(goalId?).
  - BurnRateCard — day-of-month progress bar, hero "₹X/day", total spent so far.

  3.4 SuggestionsGroup (collapsible; pocketbook:dashboard-suggestions-open-v1)

  Summary from computeSuggestionsSummary() — "2 nudges · 1 soft cap · deferral available". Contains:
  - UsagePromptsCard — "Did you use these?" cards for recent auto-debit / recurring payments (last 14 days). Yes / No buttons hit setPaymentUsageAction(id, bool). Auto-hides when empty.
  - SoftCapsCard — variable categories running at ≥80% or over their 3-month trailing average, up to 5, ranked; per row shows color dot, name, "80%" or "Over usual" badge, progress bar.
  - DeferralExperimentCard — client-only "what-if I skip this bill?" toggles on overdue/upcoming items; recomputes hypothetical free cash + remaining. Reset button. Never writes to server.

  3.5 MonthEndWrapUp — auto-opens once per month

  Bottom-sheet modal that fires on days 1–5 of a new month (first visit only; monthId "YYYY-MM" stored to prevent replays). 5 swipeable screens:
  1. Tone-colored headline ("February was a steady month") — tone from classifyTone: tight/brisk/surplus/steady
  2. Top 3 variable categories (stacked bar)
  3. Biggest single-day variable spend + date + category
  4. Days-under-average streak count
  5. Savings delta + top goal % progress
  Skip / Wrap Up buttons; progress bar at top; dismisses to pocketbook:wrapup-seen in localStorage.
  
  3.6 FirstRunTour — 4-slide intro

  Bottom-sheet carousel: "Calm by design", "Log on the fly", "Sweep what's left", "You've got this". Dots + Prev/Next + Skip. Stored to pocketbook:tour-seen-v1; also blocks MonthEndWrapUp from opening until tour is
  dismissed.

  3.7 DashboardData shape (fields available downstream)

  currency, locale, monthlyIncomePaise (baseline OR latest income entry), monthlyActualIncomePaise, hasIncomeBaseline, monthlyIncomeVariancePaise, monthlyFixedPaise, monthlyVariablePaise, remainingFixedPaise,
  avgVariablePaise, trailingMonthsForAvg, freeCashPaise, projectedEndOfMonthFreeCashPaise, projectedRunsOutAtIso, daysInMonth, daysElapsed, todaySpendPaise, monthlyBreakdowns[] (per-category trends w/ delta vs
  avg), monthlyTotals[] (6-month rollup), dailySpend[] (day-by-day, paid vs scheduled), statusCounts {paid/overdue/upcoming/inactive/skipped}, fixedHighlights[], upcomingDeductions[], recentVariable[],
  categories[], autoDebitNeedsConfirm[], pendingSweep {monthLabel, monthStart, monthEnd, surplusPaise} | null, shortfallHint {shortfallPaise, balancePaise, coverablePaise} | null, savingsBalance, 
  savingsThisMonthDeltaPaise, savingsGoalAmountPaise|null, savingsGoalTargetDate|null, monthlySavingsAvgPaise, savingsGoals[], savingsBalanceByGoal{}, spendingClimate, lifestyleInflation|null.

  ---
  4. /fixed — recurring commitments (FixedListView)
  
  4.1 Anchor bar (top)

  FixedAnchorBar — left: hero "Remaining this month" number (aria-live). Right: "Paid X of Y" + optional overdue badge.

  4.2 Auto-debit banner
  
  AutoDebitBanner — appears above the list when autoDebitNeedsConfirm.length > 0. Shows up to 5 items with a batch "Confirm" button that calls confirmAutoDebitAction(ids) — records payments for all in one shot.

  4.3 Filters — FixedFilterPill

  Pill button with category count + expanding chip row of Fixed-type categories, plus a search input (icon-toggled on mobile, always-visible on desktop). "Clear" button appears when any filter is active. Long-press
  on the search icon focuses the input via /.

  4.4 Sectioned list — FixedList

  Groups items into six buckets via groupByStatus, each expandable via CollapsibleSection:
  1. Overdue — always expanded, rendered as FixedCardFull (left color border, big card, "Mark paid" + "Skip" buttons + dropdown). Swipe right = mark paid, swipe left = skip (SwipeRow).
  2. Skipped — FixedCardFull with "Undo skip". Swipe right = undo.
  3. Upcoming — FixedCardCompact (row layout with 3-dot menu: Edit, Pause, Delete, Payment history).
  4. Paid — FixedCardCompact (menu includes Unmark paid, Payment history). 
  5. Paused (isActive=false) — FixedCardCompact + Resume in menu.
  6. Ended (past endDate) — FixedCardCompact, muted.
  
  Each card carries StatusChip — CheckCircle2 (paid), AlertCircle (overdue), Clock (upcoming), CircleDashed (ended), Pause (inactive), SkipForward (skipped).

  4.5 Form — FixedForm (bottom sheet)

  Fields: Name (autofocus), Amount (MoneyInput, 2-col with date), Category (with auto-prediction badge from note-token index), IntervalPicker (radio unit day|week|month|year + numeric value 1–365; live "Next
  renewal · in X days" hint), Start date, End date (optional), Auto-debit checkbox, Note (280 chars). Category prediction shows "Auto-set: [Category]" chip when it fires.

  4.6 Payment history — FixedHistorySheet

  Right-side sheet listing every ExpensePayment for the fixed expense with date, amount, note. Each row has an inline delete. Deleting a payment resyncs lastPaidDate from the remaining payments.

  4.7 Server actions

  fetchFixed, fetchFixedMonthPayments(ids), createFixedAction, updateFixedAction, deleteFixedAction (cascades payments), setActiveAction(id, isActive), markPaidAction(id), unmarkPaidAction(id),
  confirmAutoDebitAction(ids), skipCycleAction(id), unskipCycleAction(id), setPaymentUsageAction(paymentId, used), fetchPendingUsagePrompts(), listPaymentsAction(fixedId), deletePaymentAction(paymentId, fixedId).

  4.8 Billing engine (pure, in features/fixed/lib/billing.ts)                                                                                                                                       

  utcStartOfDay, ruleOf(fixed), nextRenewalDate(rule, ref), cycleBoundsAt(rule, ref), renewalsInRange(rule, start, end, skippedCycles?), isPaidThisCycle, deriveStatus(rule, lastPaidDate, ref, isActive, 
  skippedCycles), annualOccurrences(rule). Unit-tested for month-end clamping (Jan 31 → Feb 28), leap-day yearly renewals, weekly = 7-day equivalence, ended-past-endDate → null, ref < startDate → upcoming, DST-safe
  UTC math.
  
  ---
  5. /variable — quick-log surface (VariableListView)

  5.1 Anchor bar

  VariableAnchorBar — left: "This month · all" total (unfiltered reference, aria-live). Right: "Today · ₹X, N logs". Subtitle clarifies the filtered list below may show fewer rows.

  5.2 Quick add — VariableQuickAdd

  Compact and full variants. Amount input + chip row of Variable categories (ranked by recent usage via useRecentCategories) + Log button. Enter submits, last category persisted to
  pocketbook:last-variable-category. On mobile, this is the top of the page; the FAB opens NumpadQuickLog for bigger thumb tapping.

  5.3 Numpad — NumpadQuickLog (in the FAB sheet on mobile)

  Large ₹-prefixed amount display, top 3 category chips + "More" expander, 4×3 numpad (1–9, 0, 00, backspace), Log button. Recent category restored. Quick-preset one-tap buttons (up to 6, configured in Settings).

  5.4 Filters — VariableFilterPill and VariableFilters

  Pill has preset ranges (This month / Last 30 / Last 90 / All time), custom From/To, category chips, text search. Full-desktop VariableFilters variant always expanded. PAGE_SIZE = 20 with prev/next.

  5.5 Rituals & recurring detection

  - RitualChips — pills showing recent "usuals" detected in the last 60 days (≥3 hits, clustered by (categoryId, amount-bucket)). Overdue rituals (expectedNext + half-interval already in past) render as primary;
  others outline. Tap re-logs with amount/category pre-filled and shows "1 day ago" style relative time.
  - RecurringPatternBanner — surfaces the strongest non-dismissed pattern (same note + category, consistent amount ±20%, ≥3 months in a rolling 6-month window). "Not now" dismisses to
  pocketbook:recurring-dismissed; "Convert" opens FixedForm pre-filled (name from note, amount = median, category, startDate suggested from day-of-month median).

  5.6 Tag surface
  
  - TagInput (in the form) — comma/Enter commits tag, backspace on empty deletes last; suggestions from history; capped at 6 tags.
  - TagReflection — quiet card listing tags used ≥2 times this month, showing dominant category % and total. Auto-hides when nothing qualifies.
  - TaxExportCard — one-tap CSV export of everything tagged tax / tax-deductible / deductible for a chosen year (defaults to previous or current if before Mar 31). Columns: Date, Amount, Currency, Category, Note,
  Tags.

  5.7 List — VariableList
  
  Rendered inside **CollapsibleSection**s grouped by day via groupByDay (labels: "TODAY", "YESTERDAY", weekday for 2–6 days, dd-mmm for 7+). Each row: category icon, amount, note, tag pills. Long-press (450ms)
  enters bulk-select mode → checkboxes appear, MobileTabBar hides, FAB hides, and a bottom action bar shows Delete all + Set category (via bulkDeleteVariableAction, bulkSetCategoryAction). Edit/Delete buttons in
  normal mode.
  
  5.8 Bulk backfill — BulkCatchupSheet

  Standalone entry mode for "I forgot to log the weekend." No react-hook-form — just amount input, category, date (persist across entries), Enter commits + resets + refocuses. Session log shows committed entries
  with Undo per row.

  5.9 Server actions

  fetchVariable(filters) → {items, total, page, pageSize, monthTotalPaise, todayTotalPaise, todayCount}, createVariableAction, updateVariableAction, deleteVariableAction, bulkDeleteVariableAction(ids),
  bulkSetCategoryAction(ids, categoryId), exportTaxDeductibleCsvAction(year).

  5.10 Anti-manual helpers (features/variable/lib/)

  - detectRecurring(items, opts) — returns up to 5 candidates
  - detectRituals(items) — ≥3 hits in 60d, computes typical interval + overdue flag
  - predictCategory(note, index, validIds, minScore) — weighted-vote category prediction from token index
  - buildTagInsights(items, categories) — dominant-category-per-tag rollup
  - groupByDay(items, locale) — day-bucketed with human labels
  - useRecentCategories() — LRU cache in localStorage pocketbook:recent-variable-categories

  ---
  6. /income — the IncomeLedger (IncomeListView)
  
  6.1 Header card — "This month"

  Three-column grid: Actuals (sum of entries in current month), Baseline (expectedMonthlyPaise from Settings, "Not set" state), Variance (Actuals − Baseline, green if positive, red if negative). Collapses to single
  column on mobile.

  6.2 List — IncomeList

  Time-series entries sorted by effectiveDate desc. Each row: amount, effectiveDate, note, edit/delete icons. Latest entry (most recent effective date) shows an "Active" badge — this is the one whose amount is
  treated as monthly income when no baseline is set. Delete triggers a 6-second undo toast.

  6.3 Form — IncomeForm (sheet)

  Fields: amount (MoneyInput), effective date, note (optional, 280 chars). RHF + Zod schema.

  6.4 Actions
  
  createIncomeAction, updateIncomeAction, deleteIncomeAction, fetchIncome. All revalidate /income and /dashboard.

  ---
  7. /savings — the reserve (SavingsListView)

  7.1 Header

  Balance hero card (large number, red if negative). Buttons: Goals link → /savings/goals, Withdraw (disabled if balance ≤ 0), Deposit.

  7.2 List — SavingsList
  
  Rows for every SavingsEntry sorted by effectiveDate desc. Each: kind-specific icon + color (ArrowUp = deposit, ArrowDown = withdrawal, CalendarCheck = month_surplus, HandCoins = month_cover, TrendingUp =
  income_variance), date, optional note, "Auto" badge on system-generated (month_surplus / month_cover / income_variance) entries, delete button. Delete → 6-second undo toast.

  7.3 Form — SavingsForm (sheet, mode: "deposit"|"withdrawal")                                                                                                                                      

  Fields: goal picker (dropdown of named goals + "Unallocated"), amount, date, optional note. Smart defaults: deposit → picks least-funded goal; withdrawal → picks highest-balance goal. Withdrawal validates against
  the selected bucket's balance, not total.

  7.4 Split-sweep — SplitSweepDialog

  Confirmation modal for month-end sweeps. If any goals exist: shows a stacked bar visualizing the split, per-goal share % editable inline (w-16 inputs). Auto-zeros already-filled goals with a "✓ goal reached ·
  Include anyway" affordance. "Even split" button auto-distributes if shares don't sum to 100. Splits surplusPaise by sharePct, rounding to nearest rupee; rounding remainder assigned to largest share (no paise
  lost).
  
  7.5 Actions

  createDepositAction, createWithdrawalAction (blocks overdraft per bucket), deleteSavingsAction, fetchSavings, fetchSavingsBalance, fetchPendingSweep (previous month's surplus, if not yet swept),
  sweepMonthSurplusAction(pending, allocations?), sweepIncomeVarianceAction(goalId?) (creates income_variance entry, blocks with NO_BASELINE if not set), fetchShortfallHint, coverMonthShortfallAction(amountPaise)
  (creates month_cover entry).
  
  7.6 /savings/goals — SavingsGoalsView

  Manage up to 12 named goals. Each goal card: name, target amount (MoneyInput), targetDate, sharePct. Live "shares sum to X%" feedback; Auto-balance button. Balance summary card at top (current savings vs total
  target). Add/remove goals; validated so shares sum to ~100% (±0.5% tolerance).

  7.7 Goal detail — GoalDetailView (linked from goals list)

  Progress bar (saved vs target), pace estimate (trailing 3-month average), status pill (on-pace / behind / ahead / goal-reached), balance-trajectory sparkline (capped ~60 points), recent 8 contributions,
  Deposit-to-this-goal and Withdraw buttons.

  ---
  8. /insights — trends & breakdowns (InsightsPage)
  
  Every card lazy-loads via InView (200px root margin) with Skeleton fallbacks; heavy charts are next/dynamic.

  8.1 IncomeAllocationCard

  Horizontal stacked bar: Fixed (accent), Variable (warning), Free Cash (success). Segment list below with amounts + percentages + overspend warning. Includes pending sweep amount if applicable.

  8.2 TrajectoryCard
  
  Recharts composed chart. 6 months of history: stacked area for fixed/variable + income line on top. Plus 3-month forecast cone from buildForecast — dashed mean line inside a shaded 1σ band, income projection
  excludes zero-income months. Compact Y-axis ("₹1.2L" for large sums).

  8.3 LifestyleInflationCard

  Alert card. detectLifestyleInflation compares trailing 3-month spend to prior 3-month; renders only when growth ≥ 10%. Shows delta, prior/recent averages, top 3 contributing categories with delta/month and
  share-of-growth %.

  8.4 CategoryBreakdown

  Recharts pie/donut. Variable / Fixed tab toggle. Prev/next month arrows. List of categories with % share + trend badge (delta vs 6-month trailing avg, +/− icons, ArrowUp/ArrowDown). Loading via
  useDashboardCharts.

  8.5 SpendingHeatmapCard

  Calendar grid (weeks × 7). Intensity color = ratio of daily spend to peak. Dashed border cells = scheduled-only days (future fixed deductions), solid = paid + variable actuals — this is the paid vs scheduled
  distinction the user explicitly asked to preserve (per user's memory: keep it visible). Tap a day → detail panel with all items (variable + fixed) for that day. Prev/next month + "Jump to current" button. Weekday
  headers use locale narrow format (respects weekStart setting).
  
  ---
  9. /categories — taxonomy (CategoryListView)
  
  Two grids stacked: Fixed and Variable, each independently reorderable. Each card: CategoryIcon (icon + color badge), name, edit/delete buttons. On desktop: drag handle for reorder; on mobile: up/down chevron 
  arrows for reorder. Optimistic client-side reorder, reconciles on server response.

  9.1 CategoryForm (sheet)
  
  Live preview card at top. TypePicker — segmented Fixed/Variable radio. Name input (1–40 chars). IconPicker — 7-column grid of 40 Lucide icons (ShoppingCart, Home, Utensils, Coffee, Pizza, Car, Bus, Plane, Fuel,
  Zap, Wifi, Phone, Tv, Film, Music, Gamepad2, Book, Dumbbell, HeartPulse, Pill, GraduationCap, Briefcase, Wrench, Gift, PawPrint, Baby, Sprout, Sparkles, ReceiptText, PiggyBank, Wallet, CreditCard, ShieldCheck,
  and ~7 more). ColorPicker — 8-swatch pastel palette (CATEGORY_PALETTE).
  
  9.2 Delete guard

  deleteCategoryIfUnused returns CATEGORY_IN_USE with {fixedCount, variableCount} when linked. UI shows "Linked to N fixed and M variable — reassign or delete those first."

  9.3 Actions

  createCategoryAction, updateCategoryAction, deleteCategoryAction, reorderCategoriesAction(orderedIds), fetchCategories. Unique constraint on (userId, type, nameCI).

  ---
  10. /settings — preferences + data (SettingsForm + panels)                                                                                                                                        

  10.1 Preferences form

  - Default currency (3-letter ISO, uppercase-forced)
  - Locale (Intl string, 2–20 chars)
  - Week start — radio Sunday(0) / Monday(1)
  - Theme — radio Light / Dark / System (next-themes)
  - Savings goals — link with count (opens /savings/goals)
  - Quick log presets — up to 6, each with label + amount + category selector. Add/remove per preset. Feeds the numpad's one-tap buttons.
  - Income baseline — optional expectedMonthlyPaise; contextual Save baseline button (independent of the main form's dirty state) → updateIncomeBaselineAction.

  10.2 Import/export

  - ExportPanel — full JSON archive of all user data + per-domain CSV export (Income, Fixed, Variable, Payments, Savings, Categories) with row counts. Money exported as paise integers.
  - ImportPanel — pick domain + upload CSV → validates against per-domain Zod schemas (csv-schema.ts) with row-numbered errors → ImportPreviewModal shows adds / updates / unchanged diff → CategoryResolverDialog
  auto-creates missing category stubs → confirm applies via import-apply.ts. Repositories expose bulkUpsertX for idempotent inserts.

  10.3 Auth actions

  - json-restore.ts — restore full archive from JSON export.

  ---
  11. Preferences hooks (client-only, localStorage)
  
  - useCalmMode — pocketbook:calm-mode. Applies calm-amounts class to <html> → CSS blurs every .pb-amount span globally. Toast: "Calm mode on/off". Cross-tab via pocketbook:calm-mode:change + storage event.
  - useDensity — pocketbook:density = "cozy" | "compact". Applies density-compact to <html> → .pb-card and .pb-list-row shrink from 1rem to 0.875rem padding.
  - useDeferredFixed — pocketbook:deferred-fixed:YYYY-MM. Client-only projection state used by DeferralExperimentCard; auto-resets month-to-month, never touches server.

  ---
  12. Data model summary (db/models/)

  ┌─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────┐
  │      Model      │                                                   Key fields                                                   │                                   Notes                                    │
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ User            │ email (unique CI), passwordHash (bcrypt 12), name                                                              │ Sessions via NextAuth                                                      │
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Category        │ userId, name (unique per (userId,type)), type Fixed                                                            │ Variable, icon, color, order                                               │
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ FixedExpense    │ userId, name, amountPaise, categoryId, isActive, isAutoDebit, startDate, intervalValue, intervalUnit, endDate, │ endDate ≥ startDate validated; indexes on (userId, categoryId), (userId,   │
  │                 │  lastPaidDate, skippedCycles[], note                                                                           │ isActive), (userId, name)                                                  │
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ ExpensePayment  │ userId, fixedExpenseId, paidDate, amountPaise, usedThisCycle boolean                                           │ null, note                                                                 │
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ VariableExpense │ userId, date, amountPaise, currency, categoryId, note, tags[] (≤6, 1–24 chars each)                            │ Indexes on date desc, categoryId                                           │
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ IncomeEntry     │ userId, amountPaise, effectiveDate, note                                                                       │ Query pattern: latest by (effectiveDate, createdAt) ≤ endOfMonth           │
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ SavingsEntry    │ userId, amountPaise (signed), kind, effectiveDate, goalId                                                      │ null, note                                                                 │
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Settings        │ userId (unique), defaultCurrency, theme, weekStart, locale, savingsGoal (legacy), savingsGoals[] (≤12),        │ Self-healing schema-sentinel to bust Mongoose cache on new fields          │
  │                 │ quickPresets[] (≤6), expectedMonthlyPaise                                                                      │                                                                            │
  └─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────┘

  ---
  13. Repository layer summary (db/repositories/)
  
  Every repository returns plain objects with stringified IDs (no Mongoose docs leak); every list function accepts userId first (multi-user isolation).

  - categories — list/get/create/update/delete + deleteCategoryIfUnused, categoryUsage, reorderCategories, bulkUpsertCategories
  - fixed — CRUD + setLastPaidDate, addSkippedCycle, removeSkippedCycle, bulkUpsertFixed
  - payments — listPaymentsFor, listPaymentsForRange, listAllPayments, createPayment, setPaymentUsage, deletePayment, getMostRecentPaymentFor, unmarkLatestPayment, removePaymentAndResync, bulkRecordPayments,
  bulkUpsertPayments
  - income — CRUD + incomeForMonthEnd, incomeForMonthRange, bulkUpsertIncome
  - savings — list/get/create/delete + getSavingsBalance, getSavingsBalanceByGoal, listSavingsForGoal, hasMonthSurplus, hasMonthCover, sumSavingsInRange, sumSavingsByKindInRange, savingsAggregateForYear,
  bulkUpsertSavings
  - variable — CRUD + listVariableWithCount, bulkDeleteVariable, bulkSetCategory, variableSummary, bulkUpsertVariable
  - settings — read/upsert single doc per user
  - users — create/lookup

  ---
  14. Formatting utilities (lib/format/)
  
  - money.ts — fractionDigitsFor(currency) (0 for INR/JPY, 2 elsewhere), formatCurrency, formatCurrencyCompact ("₹1.2L"), currencySymbol, parseAmountToMinor (locale-agnostic input parsing), minorToInputString.
  - date.ts — todayUtc, utcMidnight, toDateInputValue, fromDateInputValue, formatDate, formatDateRelative ("Today"/"Yesterday"/weekday), startOfMonthUtc, endOfMonthUtc, daysAgoUtc.

  ---
  15. PWA infrastructure
  
  - public/sw.js — two-tier cache. STATIC_CACHE (versioned, cache-first for /_next/static/**, icons, fonts, images — immutable hashing means no staleness). HTML_CACHE (network-first for app-shell routes
  /dashboard|/variable|/fixed|/income|/savings|/categories|/settings; falls back to cached HTML offline). Bypasses: RSC payloads, server actions, non-GET, Next-Action header. Listens to SKIP_WAITING and
  CLEAR_CACHES.
  - ServiceWorkerRegister — production-only registration; dev unregisters and clears caches to prevent HMR staleness; emits pb:sw-update on updatefound.
  - useSwUpdate / SwUpdateToast — refresh flow above.
  - useOnlineStatus — navigator.onLine via useSyncExternalStore; SSR returns true.
  - usePullToRefresh — configurable threshold, damped drag, auto-disables when a dialog/sheet/menu is open.
  - useStandalone — checks display-mode: standalone + iOS navigator.standalone.
  - IosInstallHint — Safari-only, dismissible, safe-area-aware.
  - signOutAndClearCaches — sends CLEAR_CACHES to SW before actual signOut.
  - Manifest — start_url /dashboard, standalone, portrait, dark theme, shortcuts for Dashboard / Log expense / Income.
  - app/icon.tsx, apple-icon.tsx, splash/[size]/route.tsx — dynamic gradient "P" glyph icons + iPhone 12–15-Pro-Max splash images.

  ---
  16. Shared components (features/shared/components/)
  
  - MoneyInput — paise-integer state model, locale-aware display, currency prefix, input parses "1,250.00" and "1.250,00" via locale heuristics.
  - CategorySelect — Radix select with icon + color chip per option, filterable by type.
  - DatePicker — HTML5 native + "Today" quick-fill button + relative-hint label + optional clear.
  - ConfirmDialog — Radix dialog with destructive variant (red confirm button).

  17. UI primitives (components/ui/)

  badge, button (variants primary/secondary/ghost/outline/success/danger, sizes default/sm/lg/icon/icon-touch), card (+ CardHeader/Title/Description), confetti (CSS-driven pb-confetti-fall particles), dialog,
  dropdown-menu, form-field, glossary-tip, in-view (IntersectionObserver wrapper), input, label, long-press-breakdown (long-press gesture + reveal sheet), select, sheet (side left/right/bottom, safe-area aware),
  skeleton, sparkline (Recharts micro-chart), swipe-row (iOS-style horizontal reveal), switch.
  
  ---
  18. Global CSS variables & mobile-critical classes (app/globals.css)
  
  Colors: --bg, --surface, --surface-2, --border, --text, --muted, --accent, --accent-fg, --success, --warning, --danger, --ring. Dark mode overrides on <html data-theme="dark">. Safe areas:
  --safe-top|bottom|left|right = env(safe-area-inset-*). Mobile chrome: --mobile-tabbar-h = 56px on mobile, 0px at lg. Radii: --radius-card 12px, --radius-input 8px. Shadow: --shadow-sheet.

  Animations: sheet-slide-in|out, sheet-slide-in|out-left|bottom, overlay-fade-in|out, dialog-zoom-in|out, rise-in (480ms staggered card reveal), pb-fade-in|out, pb-slide-from-left|right, pb-slide-to-left|right
  (56px offset on mobile), pb-confetti-fall. Utility classes: .rise-in, .nav-forward, .nav-back, .calm-amounts, .pb-amount, .density-compact, .pb-card, .pb-list-row, [data-card].

  ---
  19. Cross-cutting mobile UX patterns
  
  - Optimistic updates + 6s undo toasts for every destructive action (Fixed delete, Variable delete, Savings delete, Income delete, bulk delete). Toast offset is calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 
  4.5rem) so it never sits under the FAB or tab bar. Width capped at 440px.
  - Long-press bulk-select on Variable list — 450ms threshold, hides tab bar + FAB via pocketbook:select-mode event.
  - Swipe actions on overdue/skipped Fixed cards via SwipeRow.
  - Long-press hero on FreeCashCard → LongPressBreakdown sheet.
  - Pull-to-refresh on Dashboard only.
  - Aria-live regions on anchor bars (Fixed, Variable) so screen readers announce total updates.
  - Prefers-reduced-motion — animations collapse to 1ms.
  - Tabular-nums on every amount span to prevent layout shift.
  - Category color dots applied consistently everywhere (chips, list rows, heatmap detail, pie chart segments).
  - Tap targets default to 44×44 on mobile (button size="icon-touch"), 36px on desktop.

  ---
  20. Events fired app-wide (pocketbook:*)
  
  ┌───────────────────────────────────────┬──────────────────────────────────────────────────┐
  │                 Event                 │                     Purpose                      │
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ pocketbook:open-quick-log             │ Open FAB sheet from anywhere (fired by N key)    │
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤                                                                                                      
  │ pocketbook:select-mode (detail: bool) │ Bulk-select entered/exited — tab bar & FAB hide  │
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ pocketbook:recurring-dismissed:change │ Cross-tab sync of dismissed recurring banners    │
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ pocketbook:recent-categories:change   │ Sync LRU of recent categories across tabs        │                                                                                                      
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ pocketbook:tour-seen-changed          │ Onboarding tour completed/skipped                │
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ pocketbook:ios-install-dismissed      │ User dismissed the Add-to-Home-Screen hint       │
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ pocketbook:calm-mode:change           │ Calm-mode toggled — re-apply blur class          │
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ pocketbook:deferred-fixed:change      │ Deferred-experiment set changed                  │                                                                                                      
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ pocketbook:density:change             │ Compact/cozy toggled                             │
  ├───────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ pb:sw-update                          │ New service worker installed → show update toast │
  └───────────────────────────────────────┴──────────────────────────────────────────────────┘

  21. localStorage keys
  
  pocketbook:tour-seen-v1, pocketbook:wrapup-seen (per-monthId set), pocketbook:dashboard-suggestions-open-v1, pocketbook:dashboard-pacing-open-v1, pocketbook:recurring-dismissed, pocketbook:last-variable-category,
  pocketbook:recent-variable-categories, pocketbook:calm-mode, pocketbook:deferred-fixed:YYYY-MM, pocketbook:density, pocketbook:ios-install-dismissed.

  ---
  22. Anti-manual-entry features already shipped
  
  For calibration when we design the SMS ingest layer:

  1. Category auto-prediction from note tokens (both Fixed and Variable forms show "Auto-set: X" chip)
  2. Recurring-pattern detection → convert Variable to Fixed with one tap
  3. Ritual chips → re-log usuals with pre-filled amount + category
  4. Quick log presets in Settings → one-tap logs from the numpad
  5. Recent-category LRU ranking in every chip picker
  6. Last-used-category memory in Quick Add
  7. Auto-debit rollover banner — bulk-confirm multiple at once
  8. Bulk Catchup Sheet — keyboard-first backfill loop (no RHF overhead)
  9. Bulk delete + bulk re-categorize on Variable
  10. Usage prompts card ("Did you use these?") — subscription-review flow
  11. CSV import with diff preview + category auto-resolver dialog
  12. Month-surplus sweep + income-variance sweep — automatic savings without opening the form
  13. Month-cover — one-tap savings withdrawal to cover a shortfall
  14. First-run tour + month-end wrap-up (reduces need to explore manually)

  ---
  That's every route, every visible surface, every gesture, every server action, and every persisted piece of state. When you're ready, we can layer the SMS/OCR/statement-reconciliation ingest pipeline on top of
  this — the variable_expenses collection, category auto-prediction, and draft-review UX are already the right shape to receive draft entries with minimal new plumbing.
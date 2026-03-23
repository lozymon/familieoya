# AI Features — Claude API Integration

Smart categorization is available on **Pro and Family** plans. Monthly insights, budget recommendations, and NL search are available on the **Family plan only**.
Powered by the Anthropic Claude API via a dedicated `ai-service`.

---

## Features

### 1. Smart Transaction Categorization

User types a transaction description → Claude suggests the best category.

**Example:**

- Input: `"Rema 1000 Oslo"` → suggests: `Mat`
- Input: `"Esso bensin"` → suggests: `Bil`
- Input: `"Netflix"` → suggests: `Underholdning`
- Input: `"Barnehage april"` → suggests: `Barnehage`

Works across all 3 languages — Claude understands Norwegian, Portuguese, and English descriptions.

---

### 2. Monthly Spending Insights

After each month ends (or on demand), Claude analyzes the household's spending and generates a short natural-language summary.

**Example output:**

> "This month you spent 23% more on food than last month, mostly in the last week.
> Your transport costs were down 15%. You're on track with your electricity budget."

Delivered as an in-app notification + shown on the dashboard.

---

### 3. Budget Recommendations

Based on 2–3 months of transaction history, Claude recommends realistic budget limits per category.

**Example output:**

> "Based on your last 3 months, you consistently spend around kr 4,200 on food.
> I recommend setting your food budget to kr 4,500 to give yourself some room."

Shown when a user creates a new budget or visits the budget page with no limits set.

---

### 4. Natural Language Transaction Search

User types a question in plain language → Claude translates it to a structured filter → returns matching transactions.

**Examples:**

- `"All coffee purchases last month"` → `{ category: beverages, dateRange: last month, keyword: coffee }`
- `"What did we spend on the car in 2025?"` → `{ category: car, year: 2025 }`
- `"Largest expenses this week"` → `{ dateRange: this week, sortBy: amount desc, limit: 10 }`

---

## ai-service

**No database** — stateless. Calls Claude API and returns results.
Rate-limited per household to control API costs.

### REST Endpoints

| Method | Path                         | Description                                             |
| ------ | ---------------------------- | ------------------------------------------------------- |
| POST   | `/ai/categorize`             | Suggest category for a transaction description          |
| POST   | `/ai/insights`               | Generate monthly spending insights for a household      |
| POST   | `/ai/budget-recommendations` | Recommend budget limits based on history                |
| POST   | `/ai/search`                 | Translate natural language query to transaction filters |

### Example: `/ai/categorize`

```json
// Request
{ "description": "Rema 1000 Oslo", "language": "no", "availableCategories": ["Mat", "Transport", "Bil", "Barnehage"] }

// Response
{ "categoryId": "uuid-mat", "categoryName": "Mat", "confidence": 0.95 }
```

### Example: `/ai/insights`

```json
// Request
{ "householdId": "uuid", "month": "2025-03", "language": "no" }

// Response
{ "summary": "Denne måneden brukte dere 23% mer på mat enn forrige måned..." }
```

---

## Claude API Integration

```typescript
// apps/ai-service/src/ai.service.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async categorize(description: string, categories: string[], language: string) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',  // fast + cheap for categorization
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Categorize this transaction: "${description}".
                Available categories: ${categories.join(', ')}.
                Reply with just the category name, nothing else.`
    }]
  })
  return message.content[0].text.trim()
}

async generateInsights(transactions: Transaction[], language: string) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',  // better reasoning for insights
    max_tokens: 500,
    system: `You are a helpful financial assistant for families.
             Respond in ${language}. Be concise and encouraging.`,
    messages: [{
      role: 'user',
      content: `Analyze this month's spending and give a 2-3 sentence summary:
                ${JSON.stringify(transactions)}`
    }]
  })
  return message.content[0].text
}
```

### Model selection

| Feature                | Model                       | Reason                                  |
| ---------------------- | --------------------------- | --------------------------------------- |
| Categorization         | `claude-haiku-4-5-20251001` | Fast, cheap, simple classification task |
| Insights               | `claude-sonnet-4-6`         | Better reasoning for nuanced analysis   |
| Budget recommendations | `claude-sonnet-4-6`         | Needs to reason about patterns          |
| NL search              | `claude-haiku-4-5-20251001` | Simple extraction task                  |

---

## Frontend Integration

### Categorization — in the quick-add transaction form

```
User types description → debounced call to POST /ai/categorize (300ms delay)
→ category chip auto-selects the suggestion
→ user can override manually
```

### Insights — on the dashboard

- "AI Insights" card on the dashboard (Pro/Family only)
- Shows the monthly summary
- "Refresh" button triggers a new analysis
- Locked with upgrade CTA for Free users

### NL Search — in the transaction list

- Search bar at the top of the transaction list
- If input looks like a natural language query (not a keyword), routes to `/ai/search`
- Results show with a "AI search" badge

---

## Cost Control

### Plan-based access

| Feature                | Free | Trial (14 days) | Pro / Family (paid) |
| ---------------------- | ---- | --------------- | ------------------- |
| Categorization         | ❌   | ✅ 10/day       | ✅ unlimited        |
| Monthly insights       | ❌   | ❌              | ✅ once/month       |
| Budget recommendations | ❌   | ❌              | ✅ once per 7 days  |
| NL search              | ❌   | ❌              | ✅ 20/day           |

**Reasoning:**

- Trial users get a taste of categorization (cheap, Haiku) to demonstrate value
- Insights + budget recommendations (Sonnet, expensive) are **paid-only** — these are the features that make someone upgrade, not give away free
- NL search is withheld from trial to avoid abuse

### Additional guardrails (all paid plans)

- **Categorization:** fires on input blur only (not keystroke), result cached per description string for 30 days — same description never hits the API twice
- **Insights:** generated once per month per household, result stored in DB. Manual "Refresh" button limited to **2 extra refreshes per month** to prevent abuse
- **Budget recommendations:** max once per 7 days per household, cached in DB
- **NL search:** 20 requests/household/day hard limit

```env
# ai-service
ANTHROPIC_API_KEY=sk-ant-...
AI_CATEGORIZATION_TRIAL_DAILY_LIMIT=10
AI_SEARCH_PAID_DAILY_LIMIT=20
AI_INSIGHTS_CACHE_DAYS=30
AI_BUDGET_REC_COOLDOWN_DAYS=7
```

---

## Flutter (mobile)

All 4 features are available on mobile:

- Categorization suggestion appears below the description field in the quick-add form
- Insights shown as a card on the dashboard
- NL search available in the transaction list search bar
- Budget recommendations shown when visiting budgets with no limits set

Same API calls — `ai-service` is language-agnostic.

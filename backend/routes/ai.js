const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.post('/command', authenticateToken, async (req, res) => {
  try {
    const { text, language, history = [] } = req.body;
    if (!text || text.trim().length < 1) return res.status(400).json({ message: 'Text required' });

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = now.toISOString().split('T')[0];

    const [expResult, incResult, budResult, userResult, catResult, goalResult, debtResult] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3', [req.userId, month, year]),
      pool.query('SELECT COALESCE(SUM(amount),0) as total FROM income WHERE user_id=$1 AND month=$2 AND year=$3', [req.userId, month, year]),
      pool.query('SELECT category, amount FROM budgets WHERE user_id=$1', [req.userId]),
      pool.query('SELECT name, currency FROM users WHERE id=$1', [req.userId]),
      pool.query('SELECT category, COALESCE(SUM(amount),0) as spent FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3 GROUP BY category', [req.userId, month, year]),
      pool.query('SELECT id, name, target_amount, saved_amount, goal_type FROM savings_goals WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10', [req.userId]),
      pool.query('SELECT id, name, total_amount, remaining_amount, monthly_payment FROM debts WHERE user_id=$1 AND remaining_amount > 0 ORDER BY created_at DESC LIMIT 10', [req.userId])
    ]);

    const totalSpent = parseFloat(expResult.rows[0].total);
    const totalIncome = parseFloat(incResult.rows[0].total);
    const currency = userResult.rows[0]?.currency || 'USD';
    const userName = userResult.rows[0]?.name || 'User';
    const catSpent = {};
    catResult.rows.forEach(r => { catSpent[r.category] = parseFloat(r.spent) });
    const budgetSummary = budResult.rows.length
      ? budResult.rows.map(b => {
          const spent = catSpent[b.category] || 0;
          const limit = parseFloat(b.amount);
          const pct = limit > 0 ? ((spent / limit) * 100).toFixed(0) : 0;
          const status = spent > limit ? 'OVER BUDGET' : spent / limit >= 0.8 ? 'near limit' : 'under budget';
          return `${b.category}: spent ${currency} ${spent.toFixed(2)} of ${currency} ${limit.toFixed(2)} limit (${pct}%) — ${status}`;
        }).join('\n')
      : 'none set';
    const monthName = now.toLocaleString('default', { month: 'long' });
    const isFollowUp = history.length > 0;

    const goalsSummary = goalResult.rows.length
      ? goalResult.rows.map(g => `"${g.name}" (${g.goal_type}): saved ${currency} ${parseFloat(g.saved_amount).toFixed(2)} of ${currency} ${parseFloat(g.target_amount).toFixed(2)}`).join('; ')
      : 'none';
    const debtsSummary = debtResult.rows.length
      ? debtResult.rows.map(d => `"${d.name}": ${currency} ${parseFloat(d.remaining_amount).toFixed(2)} remaining of ${currency} ${parseFloat(d.total_amount).toFixed(2)}`).join('; ')
      : 'none';

    const isLebanese = (language || '').startsWith('ar-LB') || (language || '').startsWith('ar-lb')
    const systemPrompt = `You are Spendly AI, a smart and friendly personal finance assistant embedded in the Spendly app. Always respond in the user's language (${language || 'en'}).

${isLebanese ? `LEBANESE MODE ACTIVE:
The user is Lebanese. They may write in:
1. Standard Arabic script: "دفعت على تاكسي"
2. Lebanese Latin/Arabizi — Latin letters used to write spoken Lebanese Arabic. You MUST understand this fluently.

ARABIZI DECODER (Lebanese dialect — these are the core mappings):
Numbers as letters: 2=ء/أ, 3=ع, 5=خ, 6=ط, 7=ح, 8=ق, 9=ص
Common letter combos: sh=ش, kh=خ, gh=غ, th=ث, 3=ع, l=ل, b=بـ, m=مـ, w=و, y=ي

LEBANESE VOCABULARY (Arabizi → meaning → use for):
Food/Eat: "akalt" / "akl" = أكلت/أكل → Food, "ftour"/"fytur" = فطور → Food (breakfast), "ghada" = غداء → Food (lunch), "3asha" = عشاء → Food (dinner), "tabbouleh"/"kebbeh"/"kafta"/"hummus"/"foul"/"manoushe"/"manousheh" = Lebanese food → Food, "resto"/"restaurant"/"mta3am" = مطعم → Food, "delivery" = delivery → Food
Coffee/Drinks: "ahweh"/"kahweh" = قهوة → Coffee, "3asir" = عصير → Coffee, "laban" = لبن → Coffee
Transport: "taxi"/"servis" = تاكسي/سرفيس → Transport, "uber"/"careem" → Transport, "benzin"/"benzine" = بنزين → Transport, "parking" → Transport, "mechwar" = مشوار → Transport
Shopping: "shoppe"/"hayda"/"shi" with price = item → Shopping, "mall"/"souk" = سوق → Shopping
Bills: "ijir"/"ijyer" = إيجار → Bills (rent), "kahraba"/"kahrabeh" = كهرباء → Bills, "may"/"maye" = ماء → Bills, "internet" → Bills, "mobile"/"khat" = خط → Bills
Health: "hakim"/"tabib" = طبيب → Health, "daweh"/"dawa" = دواء → Health, "hospital"/"moustachfa" = مستشفى → Health, "saydaliyyeh" = صيدلية → Health
Fitness: "nadi"/"sport"/"gym" → Fitness
Entertainment: "cinema"/"film"/"bar"/"nighclub" → Entertainment
Subscriptions: "netflix"/"spotify"/"subscription"/"ishtiraki" = اشتراكي → Subscriptions

COMMON LEBANESE FINANCE PHRASES:
"sara2t 3a" / "dafa3t 3a" / "shrit" = I spent on / I paid for / I bought → expense
"masari" / "masariyye" / "lou2" = money
"masruf" / "masarif" = expense(s)
"wfourt" / "waffart" = I saved
"tele3 3aleyyi" / "7asabli" = it cost me
"3andi" = I have
"ma 3andi" / "ma fi ma3i" = I don't have
"khasset" = I lost / spent
"rbahit" = I earned
"mish 3arif" = I don't know
"ktir" = a lot / very
"shi" = something / thing
"haida" / "hayda" = this
"shou" / "shoo" = what
"la2" = no, "ah" / "ayyo" = yes
"w" = and, "bi" = in/at/with, "la" / "la2" = for/to/no
"min" = from, "ma3" = with, "3a" = on/to/at

RESPONSE FORMAT FOR LEBANESE:
When the user writes in Arabizi OR when language is ar-LB, ALWAYS format the "response" field as:
"[Arabic script reply]\n[Lebanese Latin transliteration of same reply]"

Example response field:
"تمام، سجلت مصاريف الأكل!\nTamem, sajjalt masarif l-akl!"

Another example:
"ما عندك ميزانية للترفيه بعد.\nMa 3andak mizaniyyeh lal-tarfieh ba3d."

Keep both versions short (1-2 sentences max). Arabic first, Latin second, separated by a newline.` : ''}

User: ${userName} | Currency: ${currency} | Today: ${today}
${monthName} ${year}: Spent ${currency} ${totalSpent.toFixed(2)} | Income ${currency} ${totalIncome.toFixed(2)} | Balance ${currency} ${(totalIncome - totalSpent).toFixed(2)}
Budget status: ${budgetSummary}
Savings goals: ${goalsSummary}
Active debts: ${debtsSummary}
${isFollowUp ? `\nThis is a FOLLOW-UP turn. Use the conversation history to understand what fields were already collected and what the user is now answering.` : ''}

Return ONLY a valid JSON object. No markdown, no explanation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY AUTO-INFERENCE RULES (NEVER ask the user for category — infer it silently):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Food      → pizza, shawarma, burger, kfc, mcdonald, restaurant, lunch, dinner, breakfast, groceries, sushi, taco, delivery, eat, فطور, غداء, عشاء, مطعم, أكل, طعام, بيتزا, شاورما, برغر, بقالة, سوبرماركت, كبة, منسف, مجدرة
Coffee    → starbucks, coffee, cafe, latte, espresso, cappuccino, tea, juice, smoothie, drink, قهوة, كافيه, شاي, عصير, ستاربكس
Transport → uber, taxi, careem, lyft, bolt, bus, metro, gas, petrol, fuel, parking, toll, train, flight (local), أوبر, تاكسي, كريم, بنزين, محطة وقود, ميترو, باص, مواصلات
Shopping  → amazon, zara, h&m, mall, store, shop, clothes, shoes, electronics, ikea, groceries (non-food), تسوق, شراء, ملابس, جزمة, محل
Subscriptions → netflix, spotify, disney+, hbo, youtube premium, apple tv, crunchyroll, prime video, gym, app subscription, monthly plan, اشتراك, نتفليكس, سبوتيفاي, ديزني, جيم (monthly)
Entertainment → cinema, movie, concert, bar, club, gaming, game, arcade, bowling, festival, party, سينما, فيلم, حفلة, ترفيه, العاب
Health    → hospital, doctor, pharmacy, dentist, medicine, therapy, clinic, lab, مستشفى, دكتور, دواء, صيدلية, طبيب, تحليل
Fitness   → gym (one-time), yoga, workout, crossfit, swimming, trainer, protein, نادي رياضي, جيم (visit), تمرين, رياضة
Education → tuition, school, university, course, class, lesson, book (study), certificate, تعليم, مدرسة, جامعة, دورة, درس
Bills     → rent, electricity, water, internet, phone bill, gas bill, cable, utility, loan payment, mortgage, إيجار, كهرباء, ماء, انترنت, فاتورة, هاتف
Travel    → flight, hotel, airbnb, booking, visa, resort, cruise, trip, vacation, سفر, فندق, طيران, حجز, تأشيرة
Gifts     → gift, present, flowers, charity, donation, birthday, wedding, هدية, تبرع, ورد
Other     → default if nothing above matches

ARABIC UNDERSTANDING: Fully understand Lebanese, Egyptian, Gulf, Levantine Arabic dialects AND Lebanese Arabizi (Latin-spelled Lebanese Arabic). Examples:
- "akalt pizza" / "aklt pizza" / "sara2t 3a pizza" → Food
- "dafa3t taxi" / "rekibt uber" → Transport
- "7asabli kahraba" / "fatourit internet" → Bills
- "ishtarakto b netflix" / "3andi netflix" → Subscriptions
- "shrit t-shirt" / "ruhit 3a mall" → Shopping
- "hayda masruf akl" → Food expense
- "3andi ma3ash lyom" / "rbahit shi" → Income

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL FIELD RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- add_expense: ONLY ask for amount if missing. Infer category automatically. Description is optional.
- add_income: ONLY ask for amount if missing. Source is optional (default Salary).
- set_budget: needs category AND amount
- add_goal (savings): needs name AND target_amount
- add_goal (debt): needs name AND total_amount
- complete_goal: needs name (match from savings goals list)
- complete_debt: needs name (match from active debts list)
- add_funds_to_goal: needs name AND amount
- make_debt_payment: needs name AND amount
- add_networth_item: needs name, amount, type

RECURRING DETECTION: If the expense description sounds like a subscription (Netflix, Spotify, gym monthly, any "monthly fee") OR if it's an income entry, AND the user has not mentioned whether it's recurring, ask as a follow-up: "Is this recurring? (daily / weekly / monthly / one-time)"
When the user confirms recurring with a frequency → include is_recurring: true and recurring_frequency in the data.

Ask for ONE missing field at a time.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTENT TYPES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "need_more_info" → required field missing or recurring confirmation needed
- "navigate" → user wants to go to a page
- "add_expense" → log a purchase/expense
- "add_income" → log income
- "set_budget" → set a budget limit
- "add_goal" → create savings or debt goal
- "complete_goal" → mark a savings goal as done
- "complete_debt" → mark a debt as fully paid
- "add_funds_to_goal" → add money toward a savings goal
- "make_debt_payment" → record a payment on a debt
- "add_networth_item" → add an asset or liability to net worth
- "delete_last_expense" → user wants to delete their most recent expense
- "update_last_expense" → user wants to update a field on their most recent expense
- "chat" → question, advice, financial tips, or anything else the user asks

For "chat" intent: answer the question helpfully. You can discuss budgeting tips, savings advice, debt strategies, how to use Spendly features, financial concepts, or anything finance-related. Be concise (max 3 sentences).

Response JSON format:
{
  "intent": "<type>",
  "navigate_to": "<path or null>",
  "data": <object or null>,
  "response": "<friendly reply in user's language, max 2 sentences>",
  "question": "<if need_more_info: the specific question to ask>",
  "partial_intent": "<if need_more_info: the intended action>",
  "partial_data": <if need_more_info: data collected so far>
}

Data schemas:
- add_expense: { "amount": number, "category": "Food|Coffee|Transport|Shopping|Subscriptions|Entertainment|Health|Fitness|Education|Bills|Travel|Gifts|Other", "description": "merchant/item", "date": "${today}", "is_recurring": false, "recurring_frequency": "monthly" }
- add_income: { "amount": number, "source": "Salary|Freelance|Business|Investment|Other", "month": ${month}, "year": ${year}, "is_recurring": false, "recurring_frequency": "monthly" }
- set_budget: { "category": "Food|Coffee|Transport|Shopping|Subscriptions|Entertainment|Health|Fitness|Education|Bills|Travel|Gifts|Other", "amount": number, "period": "monthly" }
- add_goal (savings): { "name": "goal name", "target_amount": number, "saved_amount": 0, "goal_type": "Other" }
- add_goal (debt): { "name": "debt name", "total_amount": number, "remaining_amount": number, "monthly_payment": number, "interest_rate": 0, "category": "Other", "type": "debt" }
- complete_goal: { "name": "exact or partial goal name from list" }
- complete_debt: { "name": "exact or partial debt name from list" }
- add_funds_to_goal: { "name": "goal name", "amount": number }
- make_debt_payment: { "name": "debt name", "amount": number }
- add_networth_item: { "name": string, "amount": number, "type": "asset|liability", "category": "Cash & Bank|Savings|Investments|Real Estate|Vehicle|Credit Card|Mortgage|Car Loan|Student Loan|Personal Loan|Other" }
- update_last_expense: { "field": "amount|description|category|date", "value": <new value> }
- navigate: set navigate_to to one of: /dashboard /transactions /budgets /goals /wellness /profile /reports /net-worth`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8),
      { role: 'user', content: text }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 400, temperature: 0.2, messages })
    });

    const aiData = await response.json();
    if (!response.ok) throw new Error(aiData.error?.message || 'AI error');

    const raw = aiData.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ message: 'Could not understand', response: raw });

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (e) {
    console.error('AI command error:', e);
    res.status(500).json({ message: 'AI error', error: e.message });
  }
});

module.exports = router;

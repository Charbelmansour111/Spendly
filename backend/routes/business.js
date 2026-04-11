const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// ── DAILY REVENUE ────────────────────────────────────────

router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_revenue WHERE user_id=$1 ORDER BY date DESC LIMIT 90', [req.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/revenue', authenticateToken, async (req, res) => {
  try {
    const { date, total_revenue, notes, scan_raw } = req.body;
    if (!date || total_revenue === undefined) return res.status(400).json({ message: 'Date and revenue required' });
    const existing = await pool.query('SELECT id FROM daily_revenue WHERE user_id=$1 AND date=$2', [req.userId, date]);
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        'UPDATE daily_revenue SET total_revenue=$1, notes=$2 WHERE user_id=$3 AND date=$4 RETURNING *',
        [total_revenue, notes || null, req.userId, date]
      );
      return res.json(updated.rows[0]);
    }
    const result = await pool.query(
      'INSERT INTO daily_revenue (user_id, date, total_revenue, notes, scan_raw) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.userId, date, total_revenue, notes || null, scan_raw || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { console.log(e); res.status(500).json({ message: 'Server error' }) }
});

router.delete('/revenue/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM daily_revenue WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── BUSINESS EXPENSES ────────────────────────────────────

router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const BIZ_CATS = ['Ingredients','Staff','Rent','Utilities','Marketing','Equipment','Packaging','Other'];
    const result = await pool.query('SELECT * FROM expenses WHERE user_id=$1 AND category=ANY($2) ORDER BY date DESC', [req.userId, BIZ_CATS]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── EMPLOYEES ────────────────────────────────────────────

router.get('/employees', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/employees', authenticateToken, async (req, res) => {
  try {
    const { name, role, salary, salary_type, phone } = req.body;
    if (!name || !salary) return res.status(400).json({ message: 'Name and salary required' });
    const result = await pool.query(
      'INSERT INTO employees (user_id, name, role, salary, salary_type, phone) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.userId, name.trim(), role || 'Staff', salary, salary_type || 'monthly', phone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.put('/employees/:id', authenticateToken, async (req, res) => {
  try {
    const { name, role, salary, salary_type, phone, is_active } = req.body;
    const result = await pool.query(
      'UPDATE employees SET name=$1, role=$2, salary=$3, salary_type=$4, phone=$5, is_active=$6 WHERE id=$7 AND user_id=$8 RETURNING *',
      [name, role, salary, salary_type, phone, is_active !== undefined ? is_active : true, req.params.id, req.userId]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/employees/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE employees SET is_active=FALSE WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Employee removed' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── PAYROLL ──────────────────────────────────────────────

router.get('/payroll', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const result = await pool.query(
      'SELECT p.*, e.name as employee_name, e.role FROM payroll p JOIN employees e ON p.employee_id=e.id WHERE p.user_id=$1 AND p.month=$2 AND p.year=$3 ORDER BY e.name',
      [req.userId, month || new Date().getMonth() + 1, year || new Date().getFullYear()]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/payroll', authenticateToken, async (req, res) => {
  try {
    const { employee_id, month, year, amount, is_paid, notes } = req.body;
    if (!employee_id || !month || !year || !amount) return res.status(400).json({ message: 'Missing fields' });
    const existing = await pool.query('SELECT id FROM payroll WHERE user_id=$1 AND employee_id=$2 AND month=$3 AND year=$4', [req.userId, employee_id, month, year]);
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE payroll SET amount=$1, is_paid=$2, paid_at=$3, notes=$4 WHERE user_id=$5 AND employee_id=$6 AND month=$7 AND year=$8 RETURNING *',
        [amount, is_paid || false, is_paid ? new Date() : null, notes || null, req.userId, employee_id, month, year]
      );
    } else {
      result = await pool.query(
        'INSERT INTO payroll (user_id, employee_id, month, year, amount, is_paid, paid_at, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [req.userId, employee_id, month, year, amount, is_paid || false, is_paid ? new Date() : null, notes || null]
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── MENU ITEMS ───────────────────────────────────────────

router.get('/menu', authenticateToken, async (req, res) => {
  try {
    const items = await pool.query('SELECT * FROM menu_items WHERE user_id=$1 AND is_active=TRUE ORDER BY category, name', [req.userId]);
    const itemsWithRecipes = await Promise.all(items.rows.map(async (item) => {
      const recipes = await pool.query(
        'SELECT r.*, i.name as ingredient_name, i.unit FROM recipes r JOIN ingredients i ON r.ingredient_id=i.id WHERE r.menu_item_id=$1',
        [item.id]
      );
      return { ...item, recipes: recipes.rows };
    }));
    res.json(itemsWithRecipes);
  } catch (e) { console.log(e); res.status(500).json({ message: 'Server error' }) }
});

router.post('/menu', authenticateToken, async (req, res) => {
  try {
    const { name, category, price } = req.body;
    if (!name || !price) return res.status(400).json({ message: 'Name and price required' });

    // Check for duplicate
    const existing = await pool.query(
      'SELECT id FROM menu_items WHERE user_id=$1 AND LOWER(name)=LOWER($2) AND is_active=TRUE',
      [req.userId, name.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: `"${name}" already exists in your menu!` });
    }

    const result = await pool.query(
      'INSERT INTO menu_items (user_id, name, category, price) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.userId, name.trim(), category || 'Main', price]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.put('/menu/:id', authenticateToken, async (req, res) => {
  try {
    const { name, category, price } = req.body;
    const result = await pool.query(
      'UPDATE menu_items SET name=$1, category=$2, price=$3 WHERE id=$4 AND user_id=$5 RETURNING *',
      [name, category, price, req.params.id, req.userId]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/menu/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE menu_items SET is_active=FALSE WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Item removed' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── RECIPES ──────────────────────────────────────────────

router.post('/recipe', authenticateToken, async (req, res) => {
  try {
    const { menu_item_id, ingredient_id, quantity, recipe_unit } = req.body;
    if (!menu_item_id || !ingredient_id || !quantity) return res.status(400).json({ message: 'All fields required' });
    const item = await pool.query('SELECT id FROM menu_items WHERE id=$1 AND user_id=$2', [menu_item_id, req.userId]);
    if (item.rows.length === 0) return res.status(403).json({ message: 'Not authorized' });
    const ing = await pool.query('SELECT unit FROM ingredients WHERE id=$1', [ingredient_id]);
    const stockUnit = ing.rows[0]?.unit || recipe_unit;
    let deductQty = parseFloat(quantity);
    const rUnit = recipe_unit || stockUnit;
    if (rUnit === 'g'  && stockUnit === 'kg') deductQty = deductQty / 1000;
    if (rUnit === 'kg' && stockUnit === 'g')  deductQty = deductQty * 1000;
    if (rUnit === 'ml' && stockUnit === 'L')  deductQty = deductQty / 1000;
    if (rUnit === 'L'  && stockUnit === 'ml') deductQty = deductQty * 1000;
    const existing = await pool.query('SELECT id FROM recipes WHERE menu_item_id=$1 AND ingredient_id=$2', [menu_item_id, ingredient_id]);
    if (existing.rows.length > 0) {
      const updated = await pool.query('UPDATE recipes SET quantity=$1 WHERE menu_item_id=$2 AND ingredient_id=$3 RETURNING *', [deductQty, menu_item_id, ingredient_id]);
      return res.json(updated.rows[0]);
    }
    const result = await pool.query('INSERT INTO recipes (menu_item_id, ingredient_id, quantity) VALUES ($1,$2,$3) RETURNING *', [menu_item_id, ingredient_id, deductQty]);
    res.status(201).json(result.rows[0]);
  } catch (e) { console.log(e); res.status(500).json({ message: 'Server error' }) }
});

router.delete('/recipe/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM recipes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Removed' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── STOCK / INGREDIENTS ──────────────────────────────────

router.get('/stock', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients WHERE user_id=$1 ORDER BY name', [req.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/stock', authenticateToken, async (req, res) => {
  try {
    const { name, unit, cost_per_unit, stock_quantity, low_stock_alert, color, emoji, pieces_per_container } = req.body;
    if (!name || !unit || !cost_per_unit) return res.status(400).json({ message: 'Name, unit and cost required' });
    const result = await pool.query(
      'INSERT INTO ingredients (user_id, name, unit, cost_per_unit, stock_quantity, low_stock_alert, color, emoji, pieces_per_container) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.userId, name.trim(), unit, cost_per_unit, stock_quantity || 0, low_stock_alert || 0, color || '#6B7280', emoji || '📦', pieces_per_container || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { console.log(e); res.status(500).json({ message: 'Server error' }) }
});

router.put('/stock/:id', authenticateToken, async (req, res) => {
  try {
    const { stock_quantity, cost_per_unit, low_stock_alert, name, unit, color, emoji, pieces_per_container } = req.body;
    const result = await pool.query(
      `UPDATE ingredients SET
        stock_quantity=COALESCE($1, stock_quantity),
        cost_per_unit=COALESCE($2, cost_per_unit),
        low_stock_alert=COALESCE($3, low_stock_alert),
        name=COALESCE($4, name),
        unit=COALESCE($5, unit),
        color=COALESCE($6, color),
        emoji=COALESCE($7, emoji),
        pieces_per_container=COALESCE($8, pieces_per_container)
       WHERE id=$9 AND user_id=$10 RETURNING *`,
      [
        stock_quantity !== undefined ? stock_quantity : null,
        cost_per_unit  !== undefined ? cost_per_unit  : null,
        low_stock_alert !== undefined ? low_stock_alert : null,
        name  || null, unit  || null,
        color || null, emoji || null,
        pieces_per_container !== undefined ? pieces_per_container : null,
        req.params.id, req.userId
      ]
    );
    const ing = result.rows[0];
    if (ing && parseFloat(ing.stock_quantity) <= parseFloat(ing.low_stock_alert) && parseFloat(ing.low_stock_alert) > 0) {
      pool.query(
        'INSERT INTO notifications (user_id, type, message) VALUES ($1,$2,$3)',
        [req.userId, 'stock_alert', `Low stock: ${ing.name} is at ${ing.stock_quantity} ${ing.unit}`]
      ).catch(() => {});
    }
    res.json(ing);
  } catch (e) { console.log(e); res.status(500).json({ message: 'Server error' }) }
});

router.delete('/stock/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM ingredients WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Removed' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── DEDUCT STOCK ──────────────────────────────────────────

router.post('/deduct-stock', authenticateToken, async (req, res) => {
  try {
    const { items_sold } = req.body;
    if (!items_sold || !Array.isArray(items_sold)) return res.status(400).json({ message: 'items_sold array required' });
    const deductions = [];
    for (const sale of items_sold) {
      const recipes = await pool.query(
        'SELECT r.*, i.name, i.unit, i.stock_quantity, i.low_stock_alert FROM recipes r JOIN ingredients i ON r.ingredient_id=i.id WHERE r.menu_item_id=$1',
        [sale.menu_item_id]
      );
      for (const recipe of recipes.rows) {
        const totalUsed = parseFloat(recipe.quantity) * parseInt(sale.quantity_sold);
        const newStock  = Math.max(0, parseFloat(recipe.stock_quantity) - totalUsed);
        await pool.query('UPDATE ingredients SET stock_quantity=$1 WHERE id=$2 AND user_id=$3', [newStock, recipe.ingredient_id, req.userId]);
        pool.query('INSERT INTO stock_movements (user_id, ingredient_id, movement_type, quantity, note) VALUES ($1,$2,$3,$4,$5)',
          [req.userId, recipe.ingredient_id, 'out', totalUsed, `Sold ${sale.quantity_sold}x item`]).catch(() => {});
        if (newStock <= parseFloat(recipe.low_stock_alert) && parseFloat(recipe.low_stock_alert) > 0) {
          pool.query('INSERT INTO notifications (user_id, type, message) VALUES ($1,$2,$3)',
            [req.userId, 'stock_alert', `Low stock: ${recipe.name} at ${newStock.toFixed(1)} ${recipe.unit}`]).catch(() => {});
        }
        deductions.push({ ingredient: recipe.name, used: totalUsed, remaining: newStock });
      }
    }
    res.json({ message: 'Stock deducted', deductions });
  } catch (e) { console.log(e); res.status(500).json({ message: 'Server error' }) }
});

// ── AI VERIFY EXPENSE ────────────────────────────────────

router.post('/ai-verify-expense', authenticateToken, async (req, res) => {
  try {
    const { description, amount, category, ingredients } = req.body;
    const systemPrompt = `You are an AI accountant for a restaurant/business.
The user is recording a purchase. Parse their description and return ONLY valid JSON, no other text:
{
  "summary": "plain english summary",
  "stock_updates": [
    {
      "ingredient_id": <id or null>,
      "ingredient_name": "<name>",
      "quantity": <number>,
      "unit": "<unit>",
      "matched": <true/false>
    }
  ],
  "warnings": ["any warnings"]
}
Current ingredients: ${JSON.stringify(ingredients?.map(i => ({ id: i.id, name: i.name, unit: i.unit, stock: i.stock })) || [])}
Rules:
- Convert containers to base units (bags of 6 buns = 6 pieces)
- Match to existing ingredients when possible
- If category is not Ingredients, return empty stock_updates`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Purchase: "${description}". Amount: ${amount}. Category: ${category}` }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'AI error');
    const text = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (e) {
    console.log('AI verify error:', e);
    res.status(500).json({ summary: 'Could not parse', stock_updates: [], warnings: [] });
  }
});

// ── APPLY STOCK UPDATES ───────────────────────────────────

router.post('/apply-stock-updates', authenticateToken, async (req, res) => {
  try {
    const { stock_updates } = req.body;
    if (!stock_updates || !Array.isArray(stock_updates)) return res.json({ updated: 0 });
    let updated = 0;
    for (const update of stock_updates) {
      if (update.ingredient_id) {
        const ing = await pool.query('SELECT * FROM ingredients WHERE id=$1 AND user_id=$2', [update.ingredient_id, req.userId]);
        if (ing.rows.length > 0) {
          const newQty = parseFloat(ing.rows[0].stock_quantity) + parseFloat(update.quantity);
          await pool.query('UPDATE ingredients SET stock_quantity=$1 WHERE id=$2 AND user_id=$3', [newQty, update.ingredient_id, req.userId]);
          pool.query('INSERT INTO stock_movements (user_id, ingredient_id, movement_type, quantity, note) VALUES ($1,$2,$3,$4,$5)',
            [req.userId, update.ingredient_id, 'in', update.quantity, 'AI-verified purchase']).catch(() => {});
          updated++;
        }
      } else if (update.matched === false) {
        await pool.query('INSERT INTO ingredients (user_id, name, unit, cost_per_unit, stock_quantity) VALUES ($1,$2,$3,$4,$5)',
          [req.userId, update.ingredient_name, update.unit, 0, update.quantity]);
        updated++;
      }
    }
    res.json({ updated });
  } catch (e) { console.log(e); res.status(500).json({ message: 'Stock update failed' }) }
});

// ── AI INGREDIENT INFO (color + emoji) ───────────────────

router.post('/ai-ingredient-info', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `For the ingredient "${name}", return ONLY this JSON (no other text):
{"color": "#hexcolor", "emoji": "single_emoji"}
Color examples: tomato=#DC2626, lettuce=#16A34A, potato=#D97706, cheese=#FBBF24, beef=#92400E, chicken=#B45309, onion=#7C3AED, sauce=#F97316, bun=#D97706, cucumber=#16A34A, pepper=#DC2626, mushroom=#78716C, oil=#EAB308
Make each ingredient a unique distinct color.`
        }],
        max_tokens: 60,
        temperature: 0.1
      })
    });
    const data = await response.json();
    const text = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (e) {
    res.json({ color: '#6B7280', emoji: '📦' });
  }
});

// ── POS RECEIPT SCAN ─────────────────────────────────────

router.post('/pos-scan', authenticateToken, async (req, res) => {
  try {
    const { image, menu_items } = req.body;
    if (!image) return res.status(400).json({ message: 'Image required' });

    const systemPrompt = `You are a POS receipt scanner for a restaurant.
Analyze the receipt image and extract all sold items.
Return ONLY valid JSON, no other text:
{
  "items": [
    {
      "name": "item name as written on receipt",
      "quantity": <integer>,
      "unit_price": <number>,
      "total_price": <number>
    }
  ],
  "notes": "any issues or observations about the receipt"
}
Rules:
- Extract EVERY line item on the receipt
- If quantity is not shown, assume 1
- If price is not shown, set unit_price to 0
- Be precise with item names as they appear on receipt`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${image}` }
            },
            {
              type: 'text',
              text: systemPrompt
            }
          ]
        }],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Groq vision error');

    const text = data.choices[0].message.content.trim()
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text);

    // Match each scanned item to the user's menu
    const matchedItems = parsed.items.map(item => {
      const itemNameLower = item.name.toLowerCase();
      // Try exact match first, then partial match
      let match = menu_items.find(m => m.name.toLowerCase() === itemNameLower);
      if (!match) {
        match = menu_items.find(m =>
          m.name.toLowerCase().includes(itemNameLower) ||
          itemNameLower.includes(m.name.toLowerCase())
        );
      }
      return {
        ...item,
        matched: !!match,
        matched_id: match?.id || null,
        matched_name: match?.name || null,
        // Use menu price if receipt price is 0 or missing
        unit_price: item.unit_price || (match ? parseFloat(match.price) : 0)
      };
    });

    res.json({
      items: matchedItems,
      notes: parsed.notes || null,
      total_found: matchedItems.length,
      total_matched: matchedItems.filter(i => i.matched).length
    });
  } catch (e) {
    console.log('POS scan error:', e);
    res.status(500).json({ message: 'Scan failed: ' + e.message });
  }
});

// ── POS SCAN SINGLE SECTION ───────────────────────────────
router.post('/pos-scan-section', authenticateToken, async (req, res) => {
  try {
    const { image, already_found, menu_items, exchange_rate } = req.body;
    if (!image) return res.status(400).json({ message: 'Image required' });

    const alreadyList = already_found?.length > 0
      ? `Items already found (do NOT include these again): ${already_found.join(', ')}`
      : 'No items found yet.';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: 'text', text: `You are scanning a section of a Lebanese restaurant POS receipt.
Look for the "Summary By Items" section — it shows item names and quantities sold today.
${alreadyList}

Return ONLY valid JSON, no other text:
{
  "items": [
    { "name": "ITEM NAME", "quantity": 5, "unit_price": 0, "total_price": 0 }
  ]
}

Rules:
- Only extract items from "Summary By Items" section
- Quantities are numbers next to item names (e.g. "FRIES KBIR  15.00" = qty 15)
- Skip totals, taxes, payment methods, headers
- Skip any items in the already_found list above
- If section has no new items, return empty items array
- Include delivery zones (DELIVERY ZONE A, B, C etc)` }
          ]
        }],
        max_tokens: 800,
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Vision error');
    const text = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text);

    const rate = exchange_rate ? parseFloat(exchange_rate) : null;
    const items = (parsed.items || []).map(item => {
      let price = parseFloat(item.unit_price || 0);
      if (rate && price > 100) price = price / rate; // Auto-detect LL prices
      const matched = menu_items?.find(m =>
        m.name.toLowerCase() === item.name.toLowerCase() ||
        m.name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(m.name.toLowerCase())
      );
      return {
        ...item,
        unit_price: price > 0 ? price : (matched ? parseFloat(matched.price) : 0),
        matched: !!matched,
        matched_id: matched?.id || null,
        matched_name: matched?.name || null,
      };
    });

    res.json({ items, count: items.length });
  } catch (e) {
    console.log('Scan section error:', e);
    res.status(500).json({ message: 'Scan failed: ' + e.message, items: [] });
  }
});

// ── POS SUGGEST NEW ITEMS ─────────────────────────────────
router.post('/pos-suggest-items', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items?.length) return res.json([]);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: `For each of these unmatched POS items from a Lebanese restaurant, suggest a menu category and price.
Items: ${JSON.stringify(items)}
Return ONLY a JSON array, no other text:
[{"name": "item name", "category": "Burger|Sandwich|Pizza|Shawarma|Salad|Fried|Drink|Delivery|Other Food", "suggested_price": 5.00}]
Skip items that look like totals, taxes, or payment methods.` }],
        max_tokens: 400,
        temperature: 0.1
      })
    });
    const data = await response.json();
    const text = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (e) {
    res.json([]);
  }
});

module.exports = router;
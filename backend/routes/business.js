const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// ── DAILY REVENUE ────────────────────────────────────────

router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM daily_revenue WHERE user_id = $1 ORDER BY date DESC LIMIT 90',
      [req.userId]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/recipe', authenticateToken, async (req, res) => {
  try {
    const { menu_item_id, ingredient_id, quantity, recipe_unit } = req.body
    if (!menu_item_id || !ingredient_id || !quantity)
      return res.status(400).json({ message: 'All fields required' })

    const item = await pool.query('SELECT id FROM menu_items WHERE id=$1 AND user_id=$2', [menu_item_id, req.userId])
    if (item.rows.length === 0) return res.status(403).json({ message: 'Not authorized' })

    // Get ingredient's stock unit to calculate conversion
    const ing = await pool.query('SELECT unit FROM ingredients WHERE id=$1', [ingredient_id])
    const stockUnit = ing.rows[0]?.unit || recipe_unit

    // Calculate how much to deduct from stock (convert recipe unit to stock unit)
    let deductQty = parseFloat(quantity)
    const rUnit = recipe_unit || stockUnit
    if (rUnit === 'g'  && stockUnit === 'kg') deductQty = deductQty / 1000
    if (rUnit === 'kg' && stockUnit === 'g')  deductQty = deductQty * 1000
    if (rUnit === 'ml' && stockUnit === 'L')  deductQty = deductQty / 1000
    if (rUnit === 'L'  && stockUnit === 'ml') deductQty = deductQty * 1000

    const existing = await pool.query(
      'SELECT id FROM recipes WHERE menu_item_id=$1 AND ingredient_id=$2',
      [menu_item_id, ingredient_id]
    )
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        'UPDATE recipes SET quantity=$1 WHERE menu_item_id=$2 AND ingredient_id=$3 RETURNING *',
        [deductQty, menu_item_id, ingredient_id]
      )
      return res.json(updated.rows[0])
    }
    const result = await pool.query(
      'INSERT INTO recipes (menu_item_id, ingredient_id, quantity) VALUES ($1,$2,$3) RETURNING *',
      [menu_item_id, ingredient_id, deductQty]
    )
    res.status(201).json(result.rows[0])
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/revenue/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM daily_revenue WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── BUSINESS EXPENSES ────────────────────────────────────
// Uses existing expenses table — business categories only

router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const BIZ_CATS = ['Ingredients', 'Staff', 'Rent', 'Utilities', 'Marketing', 'Equipment', 'Packaging', 'Other'];
    const result = await pool.query(
      'SELECT * FROM expenses WHERE user_id=$1 AND category=ANY($2) ORDER BY date DESC',
      [req.userId, BIZ_CATS]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── EMPLOYEES ────────────────────────────────────────────

router.get('/employees', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM employees WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC',
      [req.userId]
    );
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
      `SELECT p.*, e.name as employee_name, e.role
       FROM payroll p JOIN employees e ON p.employee_id=e.id
       WHERE p.user_id=$1 AND p.month=$2 AND p.year=$3 ORDER BY e.name`,
      [req.userId, month || new Date().getMonth() + 1, year || new Date().getFullYear()]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.post('/payroll', authenticateToken, async (req, res) => {
  try {
    const { employee_id, month, year, amount, is_paid, notes } = req.body;
    if (!employee_id || !month || !year || !amount)
      return res.status(400).json({ message: 'Missing required fields' });
    const existing = await pool.query(
      'SELECT id FROM payroll WHERE user_id=$1 AND employee_id=$2 AND month=$3 AND year=$4',
      [req.userId, employee_id, month, year]
    );
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
    const items = await pool.query(
      'SELECT * FROM menu_items WHERE user_id=$1 AND is_active=TRUE ORDER BY category, name',
      [req.userId]
    );
    // Attach recipes to each item
    const itemsWithRecipes = await Promise.all(items.rows.map(async item => {
      const recipes = await pool.query(
        'SELECT r.*, i.name as ingredient_name, i.unit FROM recipes r JOIN ingredients i ON r.ingredient_id=i.id WHERE r.menu_item_id=$1',
        [item.id]
      );
      return { ...item, recipes: recipes.rows };
    }));
    res.json(itemsWithRecipes);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/menu', authenticateToken, async (req, res) => {
  try {
    const { name, category, price } = req.body;
    if (!name || !price) return res.status(400).json({ message: 'Name and price required' });
    const result = await pool.query(
      'INSERT INTO menu_items (user_id, name, category, price) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.userId, name.trim(), category || 'Main', price]
    );
    res.status(201).json(result.rows[0]);
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
    const { menu_item_id, ingredient_id, quantity } = req.body;
    if (!menu_item_id || !ingredient_id || !quantity)
      return res.status(400).json({ message: 'All fields required' });
    // Verify menu item belongs to this user
    const item = await pool.query('SELECT id FROM menu_items WHERE id=$1 AND user_id=$2', [menu_item_id, req.userId]);
    if (item.rows.length === 0) return res.status(403).json({ message: 'Not authorized' });
    // Check if already exists — update instead
    const existing = await pool.query(
      'SELECT id FROM recipes WHERE menu_item_id=$1 AND ingredient_id=$2',
      [menu_item_id, ingredient_id]
    );
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        'UPDATE recipes SET quantity=$1 WHERE menu_item_id=$2 AND ingredient_id=$3 RETURNING *',
        [quantity, menu_item_id, ingredient_id]
      );
      return res.json(updated.rows[0]);
    }
    const result = await pool.query(
      'INSERT INTO recipes (menu_item_id, ingredient_id, quantity) VALUES ($1,$2,$3) RETURNING *',
      [menu_item_id, ingredient_id, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/recipe/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM recipes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Recipe ingredient removed' });
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
    const { name, unit, cost_per_unit, stock_quantity, low_stock_alert } = req.body;
    if (!name || !unit || !cost_per_unit)
      return res.status(400).json({ message: 'Name, unit and cost required' });
    const result = await pool.query(
      'INSERT INTO ingredients (user_id, name, unit, cost_per_unit, stock_quantity, low_stock_alert) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.userId, name.trim(), unit, cost_per_unit, stock_quantity || 0, low_stock_alert || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.put('/stock/:id', authenticateToken, async (req, res) => {
  try {
    const { stock_quantity, cost_per_unit, low_stock_alert, name, unit } = req.body;
    const result = await pool.query(
      'UPDATE ingredients SET stock_quantity=$1, cost_per_unit=$2, low_stock_alert=$3, name=COALESCE($4,name), unit=COALESCE($5,unit) WHERE id=$6 AND user_id=$7 RETURNING *',
      [stock_quantity, cost_per_unit, low_stock_alert, name || null, unit || null, req.params.id, req.userId]
    );
    // Check if now low stock — create notification
    const ing = result.rows[0];
    if (ing && parseFloat(ing.stock_quantity) <= parseFloat(ing.low_stock_alert) && parseFloat(ing.low_stock_alert) > 0) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
        [req.userId, 'stock_alert', `Low stock: ${ing.name} is at ${ing.stock_quantity}${ing.unit} (minimum: ${ing.low_stock_alert}${ing.unit})`]
      ).catch(() => {});
    }
    res.json(ing);
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

router.delete('/stock/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM ingredients WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Ingredient removed' });
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
});

// ── DEDUCT STOCK FROM POS SCAN ───────────────────────────
// Called when a daily revenue scan is processed
// Deducts ingredient quantities based on items sold + their recipes

router.post('/deduct-stock', authenticateToken, async (req, res) => {
  try {
    const { items_sold } = req.body;
    // items_sold: [{ menu_item_id, quantity_sold }]
    if (!items_sold || !Array.isArray(items_sold))
      return res.status(400).json({ message: 'items_sold array required' });

    const deductions = [];
    for (const sale of items_sold) {
      const recipes = await pool.query(
        'SELECT r.*, i.name, i.unit, i.stock_quantity, i.low_stock_alert FROM recipes r JOIN ingredients i ON r.ingredient_id=i.id WHERE r.menu_item_id=$1',
        [sale.menu_item_id]
      );
      for (const recipe of recipes.rows) {
        const totalUsed = parseFloat(recipe.quantity) * parseInt(sale.quantity_sold);
        const newStock  = parseFloat(recipe.stock_quantity) - totalUsed;
        await pool.query(
          'UPDATE ingredients SET stock_quantity=$1 WHERE id=$2 AND user_id=$3',
          [Math.max(0, newStock), recipe.ingredient_id, req.userId]
        );
        // Log stock movement
        await pool.query(
          'INSERT INTO stock_movements (user_id, ingredient_id, movement_type, quantity, note) VALUES ($1,$2,$3,$4,$5)',
          [req.userId, recipe.ingredient_id, 'out', totalUsed, `Sold ${sale.quantity_sold}x item`]
        ).catch(() => {});
        // Auto low stock notification
        if (newStock <= parseFloat(recipe.low_stock_alert) && parseFloat(recipe.low_stock_alert) > 0) {
          await pool.query(
            'INSERT INTO notifications (user_id, type, message) VALUES ($1,$2,$3)',
            [req.userId, 'stock_alert', `Low stock: ${recipe.name} is at ${Math.max(0, newStock).toFixed(1)}${recipe.unit}`]
          ).catch(() => {});
        }
        deductions.push({ ingredient: recipe.name, used: totalUsed, remaining: Math.max(0, newStock) });
      }
    }
    res.json({ message: 'Stock deducted', deductions });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── AI VERIFY EXPENSE ────────────────────────────────────
// Parses natural language description and maps to ingredients

router.post('/ai-verify-expense', authenticateToken, async (req, res) => {
  try {
    const { description, amount, category, ingredients } = req.body

    const systemPrompt = `You are an AI accountant for a restaurant/business. 
The user is recording a purchase. Parse their description and return a JSON object.

Current ingredients in stock: ${JSON.stringify(ingredients.map(i => ({ id: i.id, name: i.name, unit: i.unit, current_stock: i.stock })))}

Return ONLY valid JSON in this exact format, no other text:
{
  "summary": "plain english summary of what you understood",
  "stock_updates": [
    {
      "ingredient_id": <id of matching ingredient or null if new>,
      "ingredient_name": "<name>",
      "quantity": <number>,
      "unit": "<unit>",
      "matched": <true if matched existing ingredient, false if new>
    }
  ],
  "warnings": ["any warnings about unusual quantities or mismatches"]
}

Rules:
- If user says "2 bags of burger buns" and a bag typically has 6 buns, stock_updates should show 12 buns
- If user says "5kg beef" try to match to existing beef ingredient
- If no ingredient match found, set matched: false and ingredient_id: null
- Always try to convert to the base unit the ingredient uses (e.g. bags→pieces, boxes→pieces)
- If category is not Ingredients, return empty stock_updates array`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Purchase description: "${description}". Amount paid: ${amount}. Category: ${category}` }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'AI error')

    const text = data.choices[0].message.content.trim()
    // Strip markdown code blocks if AI wrapped in them
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    res.json(parsed)
  } catch (e) {
    console.log('AI verify error:', e)
    res.status(500).json({ message: 'AI verification failed', summary: 'Could not parse', stock_updates: [], warnings: [] })
  }
})

// ── APPLY STOCK UPDATES (from AI verified expense) ───────

router.post('/apply-stock-updates', authenticateToken, async (req, res) => {
  try {
    const { stock_updates } = req.body
    if (!stock_updates || !Array.isArray(stock_updates)) return res.json({ updated: 0 })

    let updated = 0
    for (const update of stock_updates) {
      if (update.ingredient_id) {
        // Update existing ingredient
        const ing = await pool.query('SELECT * FROM ingredients WHERE id=$1 AND user_id=$2', [update.ingredient_id, req.userId])
        if (ing.rows.length > 0) {
          const newQty = parseFloat(ing.rows[0].stock_quantity) + parseFloat(update.quantity)
          await pool.query(
            'UPDATE ingredients SET stock_quantity=$1 WHERE id=$2 AND user_id=$3',
            [newQty, update.ingredient_id, req.userId]
          )
          // Log stock movement
          await pool.query(
            'INSERT INTO stock_movements (user_id, ingredient_id, movement_type, quantity, note) VALUES ($1,$2,$3,$4,$5)',
            [req.userId, update.ingredient_id, 'in', update.quantity, 'AI-verified purchase']
          ).catch(() => {})
          updated++
        }
      } else if (!update.ingredient_id && update.matched === false) {
        // Create new ingredient from AI suggestion
        await pool.query(
          'INSERT INTO ingredients (user_id, name, unit, cost_per_unit, stock_quantity) VALUES ($1,$2,$3,$4,$5)',
          [req.userId, update.ingredient_name, update.unit, 0, update.quantity]
        )
        updated++
      }
    }

    res.json({ updated, message: `${updated} stock item(s) updated` })
  } catch (e) {
    console.log('Stock update error:', e)
    res.status(500).json({ message: 'Stock update failed' })
  }
})

// ── AI INGREDIENT INFO (color + emoji) ──────────────────
router.post('/ai-ingredient-info', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `For the ingredient "${name}", return ONLY a JSON object like this (no other text):
{"color": "#hex_color", "emoji": "single_emoji"}
Rules:
- color must be a hex color that represents this ingredient visually (e.g. tomato=#DC2626, lettuce=#16A34A, potato=#D97706, cheese=#FBBF24, beef=#92400E, chicken=#B45309, onion=#7C3AED, sauce=#F97316)
- emoji must be a single relevant food emoji
- make every ingredient have a unique distinct color`
        }],
        max_tokens: 60,
        temperature: 0.1
      })
    })
    const data = await response.json()
    const text = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(text)
    res.json(parsed)
  } catch (e) {
    res.json({ color: '#6B7280', emoji: '📦' })
  }
})

module.exports = router;
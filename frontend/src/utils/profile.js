const SESSION_KEY = 'spendly_wallet_remember'

export function getWalletKey() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}')
    const wid = session?.wallet?.id
    if (wid) return String(wid)
    return JSON.parse(localStorage.getItem('user') || '{}').id || 'guest'
  } catch { return 'guest' }
}

export function getProfile() {
  try {
    const raw = localStorage.getItem(`fina_profile_${getWalletKey()}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveProfile(data) {
  localStorage.setItem(`fina_profile_${getWalletKey()}`, JSON.stringify(data))
}

/* Returns a savings-target % based on the user's top financial priority */
export function getSavingsTargetPct(profile) {
  if (!profile?.financial_priorities?.length) return 10
  const top = profile.financial_priorities[0]
  if (top === 'home') return 25
  if (top === 'wealth' || top === 'emergency_fund') return 20
  if (top === 'debt_free') return 15
  return 10
}

/* Builds a rich text block injected as AI context for every chat call */
export function buildProfileContext(profile) {
  if (!profile) return null

  const lines = [
    '=== USER FINANCIAL PROFILE (personalise ALL advice based on this) ===',
  ]

  const roleLabels = {
    student: 'Student',
    working: 'Working professional (employed)',
    parent: 'Parent / family caregiver',
    self_employed: 'Self-employed / business owner',
    family: 'Supporting family members financially',
  }
  if (profile.roles?.length) {
    lines.push(`Life situation: ${profile.roles.map(r => roleLabels[r] || r).join(' + ')}`)
  }

  const housingLabels = {
    rent: 'pays own rent/mortgage',
    family: 'lives with family (lower direct housing cost)',
    campus: 'campus/student housing',
    shared: 'shares rent with roommates',
  }
  if (profile.housing) {
    lines.push(`Housing: ${housingLabels[profile.housing] || profile.housing}`)
  }

  if (profile.pays_tuition === true) {
    lines.push('Education: pays own university tuition — a significant fixed cost')
  } else if (profile.pays_tuition === false && profile.roles?.includes('student')) {
    lines.push('Education: family covers tuition — personal budget excludes tuition')
  }

  if (profile.graduation_year) {
    const now = new Date().getFullYear()
    const diff = profile.graduation_year - now
    if (diff > 0) {
      lines.push(
        `Academic timeline: expects to graduate in ${profile.graduation_year} ` +
        `(${diff} year${diff !== 1 ? 's' : ''} away) — ` +
        `short/medium-term plans should account for potential income increase post-graduation`
      )
    } else if (diff === 0) {
      lines.push(`Academic timeline: graduating THIS year (${profile.graduation_year}) — a major financial transition is imminent`)
    } else {
      lines.push(`Academic timeline: graduated in ${profile.graduation_year} — likely in early career phase`)
    }
  }

  if (profile.family_support_monthly > 0) {
    lines.push(
      `Family obligations: contributes ~$${profile.family_support_monthly}/month to family/household expenses — ` +
      `treat this as a fixed monthly cost when computing disposable income`
    )
  }

  const priorityLabels = {
    emergency_fund: 'build emergency fund (3–6 months of expenses)',
    education: 'save for education costs',
    home: 'save to buy a home / down payment',
    debt_free: 'eliminate existing debt',
    big_goal: 'save for a major goal or dream',
    wealth: 'grow wealth and invest long-term',
  }
  if (profile.financial_priorities?.length) {
    lines.push(`Financial priorities: ${profile.financial_priorities.map(p => priorityLabels[p] || p).join('; ')}`)
    const top = profile.financial_priorities[0]
    const rate = getSavingsTargetPct(profile)
    lines.push(`Implied minimum savings target: ${rate}% of income (driven by "${top}" as top priority)`)
  }

  const incomeLabels = {
    salaried: 'fixed monthly salary',
    freelance: 'freelance (variable/irregular income)',
    part_time: 'part-time income',
    allowance: 'student allowance or stipend',
    business_owner: 'business owner (irregular revenue)',
    passive: 'passive or rental income',
  }
  if (profile.income_types?.length) {
    lines.push(`Income sources: ${profile.income_types.map(i => incomeLabels[i] || i).join(', ')}`)
  }

  lines.push(
    '=== END PROFILE ===',
    'CRITICAL INSTRUCTIONS:',
    '• Address ALL aspects of this user\'s situation simultaneously — if they are a student who also supports family, acknowledge and plan for BOTH realities.',
    '• Be emotionally intelligent: recognise the stress of juggling multiple responsibilities.',
    '• Give specific, actionable numbers where possible — not vague percentages alone.',
    '• When balance is growing significantly (above $5,000–$10,000 surplus), proactively suggest investment options appropriate to their risk level, but ALWAYS include a clear disclaimer to consult a licensed financial advisor before taking any investment action.',
    '• If the user mentioned a graduation date, check whether that date has passed in follow-up advice and adjust recommendations accordingly.',
  )

  return lines.join('\n')
}

/* Persist the last N chat messages for a wallet */
export function saveChatHistory(messages) {
  try {
    const key = `fina_chat_${getWalletKey()}`
    const toSave = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-60)
      .map(m => ({ role: m.role, content: m.content }))
    localStorage.setItem(key, JSON.stringify(toSave))
  } catch {}
}

export function loadChatHistory() {
  try {
    const key = `fina_chat_${getWalletKey()}`
    const stored = JSON.parse(localStorage.getItem(key) || 'null')
    return Array.isArray(stored) && stored.length > 0 ? stored : null
  } catch { return null }
}

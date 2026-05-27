import { useState } from 'react'
import { createPortal } from 'react-dom'
import API from '../utils/api'

const COMPLETION_MESSAGES = {
  student_pays_tuition:
    "I'll prioritize your tuition savings and adjust your budget accordingly.",
  student_family_pays:
    "Great news — with family covering tuition, I'll help you save more aggressively.",
  works_with_family:
    "Living with family gives you a great savings advantage. Let's use it.",
  supports_parents_rents_debt:
    "I'll factor in rent and debt as fixed costs and build your plan around them.",
  supports_parents_family_home:
    "I'll account for family obligations and build a realistic savings target.",
  single_independent:
    "Your budget plan is ready — optimized for an independent lifestyle.",
  married_1_2_kids:
    "I'll account for family expenses and build in a healthy savings buffer.",
  married_3plus_kids:
    "I'll factor in your family expenses and include an emergency buffer.",
  married_no_kids:
    "Perfect — your plan is designed for a couple with solid savings potential.",
  default:
    "Your personalized budget plan is ready to generate.",
};

function getProfileKey(answers) {
  const { life_situation, is_student, pays_tuition, housing, is_married, children_count } = answers;
  if (life_situation === 'with_family') {
    if (is_student && pays_tuition) return 'student_pays_tuition';
    if (is_student)                  return 'student_family_pays';
    return 'works_with_family';
  }
  if (life_situation === 'supporting_parents') {
    if (housing === 'family_home') return 'supports_parents_family_home';
    return 'supports_parents_rents_debt';
  }
  if (life_situation === 'independent') {
    if (!is_married) return 'single_independent';
    const k = parseInt(children_count) || 0;
    if (k >= 3)  return 'married_3plus_kids';
    if (k >= 1)  return 'married_1_2_kids';
    return 'married_no_kids';
  }
  return 'default';
}

function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${
          i < current ? 'w-5 h-2 bg-violet-600' :
          i === current ? 'w-5 h-2 bg-violet-400' :
          'w-2 h-2 bg-gray-200 dark:bg-gray-600'
        }`} />
      ))}
    </div>
  )
}

function OptionCard({ emoji, label, description, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98] cursor-pointer ${
        selected
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-900/10'
      }`}>
      <span className="text-2xl shrink-0 mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${selected ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-white'}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
        selected ? 'border-violet-500 bg-violet-500' : 'border-gray-300 dark:border-gray-600'
      }`}>
        {selected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
    </button>
  )
}

export default function BudgetOnboarding({ onComplete, onClose }) {
  const [step, setStep]       = useState(0)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  // Step definitions — each returns an array of sub-steps based on answers
  const getSteps = (ans) => {
    const steps = [
      // Step 0: life situation (everyone)
      {
        id: 'life_situation',
        question: "What is your life situation?",
        subtitle: "3 quick questions — takes 30 seconds",
        isFirst: true,
        options: [
          { value: 'with_family',         emoji: '🏠', label: 'With my family',       description: 'Low housing costs, family home' },
          { value: 'supporting_parents',  emoji: '👴', label: 'Supporting my parents', description: 'I cover rent or mortgage' },
          { value: 'independent',         emoji: '🏢', label: 'Living independently',  description: 'My own place, I pay everything' },
        ],
      },
    ];

    if (ans.life_situation === 'with_family') {
      steps.push({
        id: 'student_status',
        question: "Are you currently a student?",
        options: [
          { value: 'pays_tuition', emoji: '🎓', label: 'Yes — I pay my own tuition', description: 'Tuition comes out of my income' },
          { value: 'family_pays',  emoji: '👨‍👩‍👧', label: 'Yes — my family covers it', description: 'Education is covered for me' },
          { value: 'not_student',  emoji: '💼', label: 'No — I work',                description: 'Full-time or part-time employed' },
        ],
      });
    }

    if (ans.life_situation === 'supporting_parents') {
      steps.push({
        id: 'housing',
        question: "What is your housing situation?",
        options: [
          { value: 'rent',        emoji: '🔑', label: 'I pay rent monthly',          description: 'Renting a home or apartment' },
          { value: 'mortgage',    emoji: '🏡', label: 'I own with a mortgage',        description: 'Monthly mortgage payments' },
          { value: 'family_home', emoji: '🏠', label: "Family home — no rent",       description: "I don't pay rent" },
        ],
      });
    }

    if (ans.life_situation === 'independent') {
      steps.push({
        id: 'married',
        question: "Are you married?",
        twoCol: true,
        options: [
          { value: 'yes', emoji: '💍', label: 'Yes',   description: '' },
          { value: 'no',  emoji: '🙋', label: 'No',    description: '' },
        ],
      });

      if (ans.is_married === true) {
        steps.push({
          id: 'children',
          question: "Do you have children?",
          options: [
            { value: '1',  emoji: '👶',         label: 'Yes — 1 to 2 children',   description: '' },
            { value: '3',  emoji: '👨‍👩‍👧‍👦',       label: 'Yes — 3 or more',          description: '' },
            { value: '0',  emoji: '✨',          label: 'Not yet',                  description: '' },
          ],
        });
      }
    }

    // Income type (everyone)
    steps.push({
      id: 'income_type',
      question: "How would you describe your income?",
      options: [
        { value: 'fixed',     emoji: '💰', label: 'Fixed monthly salary',        description: 'Same amount every month' },
        { value: 'variable',  emoji: '📊', label: 'Variable — freelance / business', description: 'It changes month to month' },
        { value: 'no_income', emoji: '🎓', label: 'No regular income',           description: 'Student allowance or between jobs' },
      ],
    });

    return steps;
  };

  const steps = getSteps(answers);
  const currentStep = steps[step];
  const totalSteps  = steps.length;

  const handleOption = (stepId, value) => {
    let newAnswers = { ...answers };

    if (stepId === 'life_situation') {
      newAnswers = { life_situation: value };  // reset downstream
    } else if (stepId === 'student_status') {
      newAnswers.is_student   = value !== 'not_student';
      newAnswers.pays_tuition = value === 'pays_tuition';
    } else if (stepId === 'housing') {
      newAnswers.housing = value;
    } else if (stepId === 'married') {
      newAnswers.is_married = value === 'yes';
    } else if (stepId === 'children') {
      newAnswers.children_count = parseInt(value) || 0;
    } else if (stepId === 'income_type') {
      newAnswers.income_type = value;
    }

    setAnswers(newAnswers);
    // Auto-advance after short delay
    setTimeout(() => advanceStep(newAnswers, step + 1), 280);
  };

  const advanceStep = (ans, nextStep) => {
    const s = getSteps(ans);
    if (nextStep >= s.length) {
      finishOnboarding(ans);
    } else {
      setStep(nextStep);
    }
  };

  const finishOnboarding = async (ans) => {
    setSaving(true);
    try {
      await API.post('/profile/financial', {
        life_situation: ans.life_situation,
        housing:        ans.housing || null,
        is_student:     ans.is_student || false,
        pays_tuition:   ans.pays_tuition || false,
        is_married:     ans.is_married || false,
        children_count: ans.children_count || 0,
        income_type:    ans.income_type || 'fixed',
      });
      setDone(true);
      setTimeout(() => onComplete(ans), 2000);
    } catch {
      onComplete(ans);  // even on error, continue
    }
    setSaving(false);
  };

  const profileKey = getProfileKey(answers);

  const getCurrentValue = () => {
    const id = currentStep?.id;
    if (id === 'life_situation') return answers.life_situation;
    if (id === 'student_status') {
      if (answers.is_student && answers.pays_tuition) return 'pays_tuition';
      if (answers.is_student)                          return 'family_pays';
      if (answers.is_student === false)                return 'not_student';
      return null;
    }
    if (id === 'housing')    return answers.housing;
    if (id === 'married')    return answers.is_married === true ? 'yes' : answers.is_married === false ? 'no' : null;
    if (id === 'children')   return String(answers.children_count ?? '');
    if (id === 'income_type') return answers.income_type;
    return null;
  };

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

        {/* Header bar */}
        <div className="h-1 bg-linear-to-r from-violet-500 via-purple-500 to-indigo-500" />

        <div className="px-6 pt-6 pb-8">

          {/* Close + back row */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
              className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Done state */}
          {done ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-[scale-in_0.4s_ease-out]">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Perfect — I know your situation.
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {COMPLETION_MESSAGES[profileKey] || COMPLETION_MESSAGES.default}
              </p>
              <p className="text-xs text-violet-500 mt-3 animate-pulse">Generating your plan…</p>
            </div>
          ) : (
            <>
              <ProgressDots total={totalSteps} current={step} />

              {/* Question */}
              <div className="mb-6">
                {currentStep?.isFirst && (
                  <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2">
                    Let's personalize your budget
                  </p>
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  {currentStep?.question}
                </h2>
                {currentStep?.subtitle && (
                  <p className="text-sm text-gray-400 mt-1">{currentStep.subtitle}</p>
                )}
              </div>

              {/* Options */}
              <div className={`space-y-3 ${currentStep?.twoCol ? 'grid grid-cols-2 gap-3 space-y-0' : ''}`}>
                {currentStep?.options?.map(opt => (
                  <OptionCard
                    key={opt.value}
                    emoji={opt.emoji}
                    label={opt.label}
                    description={opt.description}
                    selected={getCurrentValue() === opt.value}
                    onClick={() => handleOption(currentStep.id, opt.value)}
                  />
                ))}
              </div>

              {saving && (
                <div className="flex items-center justify-center gap-2 mt-4 text-violet-500 text-sm">
                  <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                  Saving your profile…
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/**
 * CareerAI Mentor — Intent Detection Engine
 * Classifies user queries into 7 distinct career intents:
 * 1. career_advice
 * 2. cv_review
 * 3. skill_gap
 * 4. learning_roadmap
 * 5. mock_interview
 * 6. general_question
 * 7. out_of_scope
 */

const VALID_INTENTS = [
  'career_advice',
  'cv_review',
  'skill_gap',
  'learning_roadmap',
  'mock_interview',
  'general_question',
  'out_of_scope'
];

const INTENT_RULES = [
  {
    intent: 'mock_interview',
    patterns: [
      /\b(interview|wawancara|mock interview|simulasi wawancara|pertanyaan interview|tes kerja|latihan interview|user interview|hr interview)\b/i,
      /\b(tanyakan pertanyaan|pertanyaan berikutnya|jawab pertanyaan interview)\b/i
    ]
  },
  {
    intent: 'cv_review',
    patterns: [
      /\b(cv|resume|curriculum vitae|portfolio|portofolio|bullet point|action verb|ringkasan profesional|professional summary)\b/i,
      /\b(review cv|cek cv|koreksi cv|perbaiki cv|bedah cv|ats friendly|ats resume)\b/i
    ]
  },
  {
    intent: 'skill_gap',
    patterns: [
      /\b(skill gap|kesenjangan skill|kemampuan yang kurang|skill yang dibutuhkan|perlu belajar apa|kurang skill|analisis skill)\b/i,
      /\b(apakah skill saya cukup|komparasi skill|hard skill|soft skill)\b/i
    ]
  },
  {
    intent: 'learning_roadmap',
    patterns: [
      /\b(roadmap|jalur belajar|kurikulum|rencana belajar|tahapan belajar|jadwal belajar|silabus|study plan|learning path)\b/i,
      /\b(langkah-langkah belajar|minggu ke-|tahap 1|tahap 2)\b/i
    ]
  },
  {
    intent: 'career_advice',
    patterns: [
      /\b(karir|karier|career|pindah karir|career switch|fresh graduate|gaji|sertifikasi|promosi|lowongan|industri tech|bidang it)\b/i,
      /\b(bingung pilih jurusan|rekomendasi pekerjaan|cocok jadi apa|jalur karir|tips melamar|strategi kerja)\b/i
    ]
  },
  {
    intent: 'out_of_scope',
    patterns: [
      /\b(resep masakan|cara memasak|film bioskop|chord gitar|lirik lagu|ramalan cuaca|sepak bola skor|politik praktis)\b/i,
      /\b(buatkan puisi cinta|cerita fiksi|dongeng anak|tebak-tebakan)\b/i
    ]
  }
];

class IntentClassifier {
  /**
   * Fast rule-based heuristic classification
   */
  static classifyText(text) {
    if (!text || typeof text !== 'string') {
      return { intent: 'general_question', confidence: 0.5, method: 'fallback' };
    }

    const trimmed = text.trim();

    // Check each pattern
    for (const rule of INTENT_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          return {
            intent: rule.intent,
            confidence: 0.85,
            method: 'pattern_match'
          };
        }
      }
    }

    // Default to general_question for career queries
    return {
      intent: 'general_question',
      confidence: 0.6,
      method: 'default'
    };
  }

  /**
   * Resolves intent given user input and optional client override
   */
  static resolveIntent(userText, explicitIntent = null) {
    if (explicitIntent && VALID_INTENTS.includes(explicitIntent)) {
      return {
        intent: explicitIntent,
        confidence: 1.0,
        method: 'explicit'
      };
    }

    return this.classifyText(userText);
  }

  static getValidIntents() {
    return VALID_INTENTS;
  }

  /**
   * Returns intent-specific prompt instructions to specialize Gemini's output
   */
  static getIntentPromptAugmentation(intent) {
    switch (intent) {
      case 'cv_review':
        return `
[Special Focus: CV Review]
- Evaluate the user's CV/Resume text rigorously.
- Suggest stronger action verbs and quantifiable metrics (e.g., "Increased X by Y% using Z").
- Check ATS compatibility and professional summary clarity.
- Do NOT invent or fabricate degrees, roles, dates, or false metrics.
- Keep the format structured: Strengths, Areas for Improvement, Before vs After Bullet Points.`;

      case 'skill_gap':
        return `
[Special Focus: Skill Gap Analysis]
- Clearly distinguish between Essential Skills (must-have) and Optional/Nice-to-Have Skills.
- Identify current strengths vs missing competencies for the target role.
- Provide practical mini exercises or project ideas to close each identified gap.
- Distinguish verified industry baseline skills from subjective recommendations.`;

      case 'learning_roadmap':
        return `
[Special Focus: Learning Roadmap Generator]
- Generate a progressive, realistic roadmap adapted to the user's weekly available hours.
- Break down into phases (Foundation -> Intermediate -> Advanced / Portfolio).
- Include practical weekly milestones, mini projects, recommended learning resources (concepts/topics), and tangible completion criteria.`;

      case 'mock_interview':
        return `
[Special Focus: Mock Interview Simulator]
- Act as an experienced, supportive hiring interviewer.
- Ask strictly ONE question at a time.
- If the user provided an answer to a previous question:
  1. Evaluate their answer: mention strengths, weaknesses, and a concrete example of how to answer more effectively using STAR method (Situation, Task, Action, Result).
  2. Then ask the next relevant interview question or a follow-up probe.
- Do NOT guarantee employment or claim scores are absolute.`;

      case 'career_advice':
        return `
[Special Focus: Career Consultation]
- Provide realistic, actionable career pathways and market insights.
- Explain the rationale for every suggested career direction or certification.
- Provide concrete next steps and avoid generic platitudes.`;

      case 'out_of_scope':
        return `
[Special Focus: Out of Scope Request]
- Politely inform the user that you are CareerAI Mentor, an AI specialized exclusively in professional career development, CV review, skill analysis, roadmaps, and mock interviews.
- Offer to help them with a career-related topic instead.`;

      default:
        return '';
    }
  }
}

module.exports = IntentClassifier;

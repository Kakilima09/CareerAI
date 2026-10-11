/**
 * CareerAI Mentor — Specialized Career Modules Controller
 * Dedicated endpoints for CV Review, Skill Gap Analysis, Learning Roadmaps, and Mock Interviews.
 */

const ConversationModel = require('../models/conversationModel');
const GeminiService = require('../services/geminiService');
const geminiService = new GeminiService();

class SpecializedController {
  /**
   * CV Assistant: Structured Review
   */
  static async cvReview(req, res, next) {
    try {
      const { cvText, targetRole = 'General Tech Role', jobDescription = '', conversationId } = req.body;

      if (!cvText || cvText.trim().length < 20) {
        return res.status(400).json({
          success: false,
          error: 'Please provide at least 20 characters of CV or resume content to review.'
        });
      }

      const prompt = `[REQUEST: STRUCTURED CV REVIEW]
Target Role: ${targetRole.trim()}
${jobDescription ? `Target Job Description:\n${jobDescription.trim()}\n` : ''}

CV Content to Review:
"""
${cvText.trim()}
"""

Please provide a structured, in-depth CV evaluation with the following sections:
1. Executive Summary & First Impression (ATS readiness and formatting clarity).
2. Professional Summary Critique & Suggested Rewrite (Preserve real experience, do not invent achievements).
3. Bullet Point Upgrades (Provide Before vs. After examples using Strong Action Verb + Context + Quantifiable Metric/Result).
4. Missing Skills & Keyword Alignment (Essential skills for "${targetRole}" not yet highlighted).
5. Actionable Next Steps (3 prioritized changes the user should make immediately).`;

      // Use or create conversation (with strict ownership enforcement)
      const userId = req.user ? req.user.id : null;
      let activeConvId = conversationId;

      if (activeConvId && !ConversationModel.getConversationById(activeConvId, userId)) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak: Anda tidak memiliki izin untuk percakapan ini.'
        });
      }

      if (!activeConvId) {
        const conv = ConversationModel.createConversation({
          title: `CV Review: ${targetRole.slice(0, 25)}`,
          intent: 'cv_review',
          preset: 'accurate',
          userId
        });
        activeConvId = conv.id;
      }

      ConversationModel.addMessage({
        conversationId: activeConvId,
        role: 'user',
        content: `Tolong review CV saya untuk posisi ${targetRole}:\n\n${cvText.slice(0, 300)}...`,
        intent: 'cv_review'
      });

      const result = await geminiService.generateContent({
        prompt,
        intent: 'cv_review',
        preset: 'accurate'
      });

      ConversationModel.addMessage({
        conversationId: activeConvId,
        role: 'model',
        content: result.reply,
        intent: 'cv_review'
      });

      res.json({
        success: true,
        data: {
          conversationId: activeConvId,
          intent: 'cv_review',
          reply: result.reply
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Skill Gap Analyzer
   */
  static async skillGap(req, res, next) {
    try {
      const { targetRole, currentSkills, experienceLevel = 'Junior', availableHours = '10 hours/week', conversationId } = req.body;

      if (!targetRole || !currentSkills) {
        return res.status(400).json({
          success: false,
          error: 'Target job role and current skills are both required.'
        });
      }

      const prompt = `[REQUEST: SKILL GAP ANALYSIS]
Target Position: ${targetRole.trim()}
Current Skills & Background: ${currentSkills.trim()}
Current Experience Level: ${experienceLevel}
Available Study Time: ${availableHours}

Please provide a structured Skill Gap Analysis:
1. Acquired Skills Assessment (Recognize what the user already has that aligns with the target role).
2. Essential vs. Optional Skill Gaps:
   - Must-Have Skills (Critical baseline for "${targetRole}")
   - Nice-to-Have Skills (Competitive differentiator)
3. Priority Matrix & Difficulty Estimation (Rank skills from Priority 1 to N, with difficulty level: Easy / Medium / High).
4. Practical Hands-on Exercises (For each key gap, give 1 real-world coding exercise or micro-project to prove competence).
5. Disclaimer & Industry Context (Differentiate AI recommendations from formal job prerequisites).`;

      const userId = req.user ? req.user.id : null;
      let activeConvId = conversationId;

      if (activeConvId && !ConversationModel.getConversationById(activeConvId, userId)) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak: Anda tidak memiliki izin untuk percakapan ini.'
        });
      }

      if (!activeConvId) {
        const conv = ConversationModel.createConversation({
          title: `Skill Gap: ${targetRole.slice(0, 25)}`,
          intent: 'skill_gap',
          preset: 'accurate',
          userId
        });
        activeConvId = conv.id;
      }

      ConversationModel.addMessage({
        conversationId: activeConvId,
        role: 'user',
        content: `Analisis skill gap untuk target ${targetRole}. Skill saat ini: ${currentSkills}. Level: ${experienceLevel}`,
        intent: 'skill_gap'
      });

      const result = await geminiService.generateContent({
        prompt,
        intent: 'skill_gap',
        preset: 'accurate'
      });

      ConversationModel.addMessage({
        conversationId: activeConvId,
        role: 'model',
        content: result.reply,
        intent: 'skill_gap'
      });

      res.json({
        success: true,
        data: {
          conversationId: activeConvId,
          intent: 'skill_gap',
          reply: result.reply
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learning Roadmap Generator
   */
  static async roadmap(req, res, next) {
    try {
      const { careerGoal, currentLevel = 'Beginner', weeklyHours = '10', targetMonths = '3', conversationId } = req.body;

      if (!careerGoal) {
        return res.status(400).json({
          success: false,
          error: 'Career goal is required.'
        });
      }

      const prompt = `[REQUEST: LEARNING ROADMAP GENERATOR]
Career Goal: ${careerGoal.trim()}
Current Level: ${currentLevel}
Available Study Time: ${weeklyHours} hours per week
Target Timeframe: ${targetMonths} months

Please construct a realistic, step-by-step learning roadmap tailored to this time budget:
1. Learning Goal & Strategy Overview (How the ${weeklyHours} hrs/week will be partitioned).
2. Phase Breakdown:
   - Phase 1: Core Fundamentals & Theory
   - Phase 2: Practical Application & Tooling
   - Phase 3: Real-World Projects & Portfolio Development
3. Weekly Activity Schedule & Milestones.
4. Portfolio Mini-Projects (Specify 2-3 realistic projects with clear scope).
5. Completion Criteria (Checklist to know when the user is ready to apply).`;

      const userId = req.user ? req.user.id : null;
      let activeConvId = conversationId;

      if (activeConvId && !ConversationModel.getConversationById(activeConvId, userId)) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak: Anda tidak memiliki izin untuk percakapan ini.'
        });
      }

      if (!activeConvId) {
        const conv = ConversationModel.createConversation({
          title: `Roadmap: ${careerGoal.slice(0, 25)}`,
          intent: 'learning_roadmap',
          preset: 'balanced',
          userId
        });
        activeConvId = conv.id;
      }

      ConversationModel.addMessage({
        conversationId: activeConvId,
        role: 'user',
        content: `Buatkan roadmap belajar untuk menjadi ${careerGoal} (${currentLevel}) dengan komitmen ${weeklyHours} jam/minggu selama ${targetMonths} bulan.`,
        intent: 'learning_roadmap'
      });

      const result = await geminiService.generateContent({
        prompt,
        intent: 'learning_roadmap',
        preset: 'balanced'
      });

      ConversationModel.addMessage({
        conversationId: activeConvId,
        role: 'model',
        content: result.reply,
        intent: 'learning_roadmap'
      });

      res.json({
        success: true,
        data: {
          conversationId: activeConvId,
          intent: 'learning_roadmap',
          reply: result.reply
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mock Interview Simulator (Turn-by-turn with evaluation and follow-up)
   */
  static async mockInterview(req, res, next) {
    try {
      const {
        jobRole,
        difficulty = 'Junior',
        conversationId,
        userAnswer = null,
        isConcluding = false
      } = req.body;

      if (!jobRole) {
        return res.status(400).json({
          success: false,
          error: 'Job role is required to start a mock interview.'
        });
      }

      const userId = req.user ? req.user.id : null;
      let activeConvId = conversationId;

      if (activeConvId && !ConversationModel.getConversationById(activeConvId, userId)) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak: Anda tidak memiliki izin untuk percakapan ini.'
        });
      }

      if (!activeConvId) {
        const conv = ConversationModel.createConversation({
          title: `Mock Interview: ${jobRole} (${difficulty})`,
          intent: 'mock_interview',
          preset: 'balanced',
          userId
        });
        activeConvId = conv.id;
        ConversationModel.saveMockInterview({
          conversationId: activeConvId,
          jobRole,
          difficulty
        });
      }

      const interviewState = ConversationModel.getMockInterview(activeConvId) || {
        turn_count: 0,
        status: 'active'
      };

      let prompt = '';
      if (!userAnswer || interviewState.turn_count === 0) {
        // Initial question
        prompt = `[MOCK INTERVIEW SESSION START]
Role: ${jobRole}
Seniority Level: ${difficulty}

You are the Lead Interviewer. Greet the candidate warmly and ask Question #1 (start with a fundamental technical or situational question appropriate for a ${difficulty} level ${jobRole}).
Ask ONLY this one question. Do not list multiple questions.`;
      } else if (isConcluding || interviewState.turn_count >= 5) {
        // Conclusion
        prompt = `[MOCK INTERVIEW SESSION CONCLUSION]
Role: ${jobRole}
Seniority Level: ${difficulty}
Candidate's Final Answer:
"""
${userAnswer}
"""

The interview session is now concluding.
1. Evaluate the candidate's last answer (Strengths & Improvements).
2. Provide a Comprehensive Session Summary:
   - Overall Strengths observed.
   - Key Growth Areas to practice before actual job interviews.
   - Recommended interview preparation resources.
3. Note clearly that this feedback is an educational simulation, not an absolute guarantee of employment.`;
      } else {
        // Multi-turn Q&A
        prompt = `[MOCK INTERVIEW TURN #${interviewState.turn_count + 1}]
Role: ${jobRole}
Seniority Level: ${difficulty}
Candidate's Answer to Previous Question:
"""
${userAnswer}
"""

Instructions:
1. Provide constructive evaluation of this answer:
   - What was strong.
   - What could be improved (e.g., using STAR method or more concrete technical depth).
   - A brief example of a refined answer.
2. Then, ask Question #${interviewState.turn_count + 2} (either a deeper technical probe into their answer or a new relevant question for ${jobRole}).
Ask strictly ONE question.`;
      }

      // Fetch history for interview context
      const history = ConversationModel.getBoundedHistory(activeConvId, 8);

      if (userAnswer) {
        ConversationModel.addMessage({
          conversationId: activeConvId,
          role: 'user',
          content: userAnswer,
          intent: 'mock_interview'
        });
      }

      const result = await geminiService.generateContent({
        prompt,
        history,
        intent: 'mock_interview',
        preset: 'balanced'
      });

      ConversationModel.addMessage({
        conversationId: activeConvId,
        role: 'model',
        content: result.reply,
        intent: 'mock_interview'
      });

      const updatedState = ConversationModel.incrementMockInterviewTurn(
        activeConvId,
        null,
        isConcluding || interviewState.turn_count >= 5
      );

      res.json({
        success: true,
        data: {
          conversationId: activeConvId,
          intent: 'mock_interview',
          turnCount: updatedState.turn_count,
          isCompleted: updatedState.status === 'completed',
          reply: result.reply
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SpecializedController;

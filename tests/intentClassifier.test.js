/**
 * Tests for Intent Detection Engine
 */

const IntentClassifier = require('../src/services/intentClassifier');

describe('IntentClassifier', () => {
  test('correctly identifies cv_review intent', () => {
    const input = 'Tolong review bullet point di resume dan CV saya untuk posisi backend developer';
    const result = IntentClassifier.classifyText(input);
    expect(result.intent).toBe('cv_review');
  });

  test('correctly identifies skill_gap intent', () => {
    const input = 'Saya ingin tahu analisis skill gap dan kemampuan yang kurang untuk menjadi DevOps engineer';
    const result = IntentClassifier.classifyText(input);
    expect(result.intent).toBe('skill_gap');
  });

  test('correctly identifies learning_roadmap intent', () => {
    const input = 'Buatkan roadmap belajar dan kurikulum mingguan untuk belajar React';
    const result = IntentClassifier.classifyText(input);
    expect(result.intent).toBe('learning_roadmap');
  });

  test('correctly identifies mock_interview intent', () => {
    const input = 'Saya ingin simulasi wawancara kerja dan latihan interview untuk junior developer';
    const result = IntentClassifier.classifyText(input);
    expect(result.intent).toBe('mock_interview');
  });

  test('correctly identifies career_advice intent', () => {
    const input = 'Saya fresh graduate bingung pilih jalur karir yang prospektif di industri IT';
    const result = IntentClassifier.classifyText(input);
    expect(result.intent).toBe('career_advice');
  });

  test('correctly identifies out_of_scope intent', () => {
    const input = 'Berikan saya resep masakan rendang padang yang lezat';
    const result = IntentClassifier.classifyText(input);
    expect(result.intent).toBe('out_of_scope');
  });

  test('defaults to general_question when text is generic', () => {
    const input = 'Bagaimana tips mengelola waktu kerja dengan baik?';
    const result = IntentClassifier.classifyText(input);
    expect(result.intent).toBe('general_question');
  });

  test('respects explicit intent override', () => {
    const input = 'Halo apa kabar';
    const result = IntentClassifier.resolveIntent(input, 'cv_review');
    expect(result.intent).toBe('cv_review');
    expect(result.method).toBe('explicit');
  });

  test('generates specialized prompt augmentations', () => {
    const aug = IntentClassifier.getIntentPromptAugmentation('mock_interview');
    expect(aug).toContain('Mock Interview Simulator');
    expect(aug).toContain('Ask strictly ONE question');
  });
});

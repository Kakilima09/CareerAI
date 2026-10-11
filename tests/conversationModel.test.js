/**
 * Tests for Conversation & Message Persistence Model
 */

process.env.NODE_ENV = 'test';
const ConversationModel = require('../src/models/conversationModel');
const { closeDatabase } = require('../src/config/database');

describe('ConversationModel', () => {
  afterAll(() => {
    closeDatabase();
  });

  test('creates a new conversation and persists it', () => {
    const conv = ConversationModel.createConversation({
      title: 'Testing Career Plan',
      intent: 'career_advice',
      preset: 'balanced'
    });

    expect(conv.id).toBeDefined();
    expect(conv.title).toBe('Testing Career Plan');
    expect(conv.intent).toBe('career_advice');

    const fetched = ConversationModel.getConversationById(conv.id);
    expect(fetched).not.toBeNull();
    expect(fetched.title).toBe('Testing Career Plan');
  });

  test('adds messages to a conversation and retrieves bounded history', () => {
    const conv = ConversationModel.createConversation({ title: 'Chat with History' });

    // Add 12 messages
    for (let i = 1; i <= 12; i++) {
      ConversationModel.addMessage({
        conversationId: conv.id,
        role: i % 2 === 1 ? 'user' : 'model',
        content: `Message ${i}`,
        intent: 'general_question'
      });
    }

    const conversationWithMsgs = ConversationModel.getConversationById(conv.id);
    expect(conversationWithMsgs.messages.length).toBe(12);

    // Retrieve bounded history (limit 6)
    const bounded = ConversationModel.getBoundedHistory(conv.id, 6);
    expect(bounded.length).toBe(6);
    expect(bounded[bounded.length - 1].parts[0].text).toBe('Message 12');
  });

  test('updates conversation title, intent and preset', () => {
    const conv = ConversationModel.createConversation({ title: 'Initial' });
    const updated = ConversationModel.updateConversation(conv.id, {
      title: 'Updated Title',
      preset: 'creative'
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated.preset).toBe('creative');
  });

  test('deletes a conversation and cascades messages', () => {
    const conv = ConversationModel.createConversation({ title: 'To Delete' });
    ConversationModel.addMessage({
      conversationId: conv.id,
      role: 'user',
      content: 'Hello'
    });

    ConversationModel.deleteConversation(conv.id);
    const fetched = ConversationModel.getConversationById(conv.id);
    expect(fetched).toBeNull();
  });

  test('manages mock interview lifecycle', () => {
    const conv = ConversationModel.createConversation({ title: 'Mock Interview' });
    const interview = ConversationModel.saveMockInterview({
      conversationId: conv.id,
      jobRole: 'Frontend Developer',
      difficulty: 'Junior'
    });

    expect(interview.turn_count).toBe(0);
    expect(interview.status).toBe('active');

    const updated = ConversationModel.incrementMockInterviewTurn(conv.id, null, false);
    expect(updated.turn_count).toBe(1);

    const completed = ConversationModel.incrementMockInterviewTurn(conv.id, 'Great session', true);
    expect(completed.status).toBe('completed');
    expect(completed.summary).toBe('Great session');
  });
});

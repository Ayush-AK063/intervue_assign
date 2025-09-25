const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  sender: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['teacher', 'student'],
      required: true
    }
  },
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    default: null // null for general chat, specific pollId for poll-specific chat
  },
  messageType: {
    type: String,
    enum: ['text', 'system', 'notification'],
    default: 'text'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient querying
chatMessageSchema.index({ createdAt: -1 });
chatMessageSchema.index({ pollId: 1, createdAt: -1 });
chatMessageSchema.index({ 'sender.userId': 1 });

// Static method to get recent messages
chatMessageSchema.statics.getRecentMessages = function(pollId = null, limit = 50) {
  const query = { isDeleted: false };
  if (pollId) query.pollId = pollId;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender.userId', 'username role')
    .exec();
};

// Method to soft delete message
chatMessageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  return this.save();
};

// Method to edit message
chatMessageSchema.methods.editMessage = function(newMessage) {
  this.message = newMessage;
  this.editedAt = new Date();
  return this.save();
};

// Method to add reaction
chatMessageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from same user
  this.reactions = this.reactions.filter(
    reaction => reaction.userId.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({ userId, emoji });
  return this.save();
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
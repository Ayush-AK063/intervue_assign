const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  votes: {
    type: Number,
    default: 0
  },
  voters: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    votedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [optionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  duration: {
    type: Number,
    default: 15, // seconds
    min: 5,
    max: 300
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  correctAnswer: {
    type: Number,
    default: null // option id of correct answer
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isKicked: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Calculate vote percentages
pollSchema.methods.getVotePercentages = function() {
  const total = this.totalVotes;
  if (total === 0) return this.options.map(opt => ({ ...opt.toObject(), percentage: 0 }));
  
  return this.options.map(option => ({
    ...option.toObject(),
    percentage: Math.round((option.votes / total) * 100)
  }));
};

// Start poll
pollSchema.methods.startPoll = function() {
  this.status = 'active';
  this.startTime = new Date();
  this.endTime = new Date(Date.now() + (this.duration * 1000));
  return this.save();
};

// End poll
pollSchema.methods.endPoll = function() {
  this.status = 'completed';
  this.isActive = false;
  return this.save();
};

// Add vote
pollSchema.methods.addVote = function(optionId, userId, username) {
  const option = this.options.id(optionId);
  if (!option) throw new Error('Option not found');
  
  // Check if user already voted
  const existingVote = this.options.some(opt => 
    opt.voters.some(voter => voter.userId.toString() === userId.toString())
  );
  
  if (existingVote) throw new Error('User has already voted');
  
  option.votes += 1;
  option.voters.push({ userId, username });
  this.totalVotes += 1;
  
  return this.save();
};

module.exports = mongoose.model('Poll', pollSchema);
const express = require('express');
const router = express.Router();

// In-memory storage for polls (for testing without MongoDB)
let polls = [];
let pollIdCounter = 1;

// Create a new poll
router.post('/', async (req, res) => {
  try {
    const { question, options, timeLimit, correctAnswer } = req.body;

    // Validate required fields
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Question and at least 2 options are required'
      });
    }

    // Validate time limit
    if (timeLimit && (timeLimit < 10 || timeLimit > 300)) {
      return res.status(400).json({
        success: false,
        message: 'Time limit must be between 10 and 300 seconds'
      });
    }

    // Create poll options with proper structure
    const pollOptions = options.map((option, index) => ({
      _id: `option_${pollIdCounter}_${index}`,
      text: option.text || option,
      votes: 0,
      isCorrect: correctAnswer !== undefined ? index === correctAnswer : false
    }));

    // Create new poll
    const poll = {
      _id: pollIdCounter++,
      question,
      options: pollOptions,
      timeLimit: timeLimit || 60,
      isActive: true,
      totalVotes: 0,
      createdBy: 'teacher', // Simplified for testing
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      endedAt: null
    };

    polls.push(poll);

    res.status(201).json({
      success: true,
      message: 'Poll created successfully',
      data: poll
    });

  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating poll'
    });
  }
});

// Get all polls
router.get('/', async (req, res) => {
  try {
    const { isActive, createdBy } = req.query;
    
    let filteredPolls = polls;

    // Filter by active status if provided
    if (isActive !== undefined) {
      const activeStatus = isActive === 'true';
      filteredPolls = filteredPolls.filter(poll => poll.isActive === activeStatus);
    }

    // Filter by creator if provided
    if (createdBy) {
      filteredPolls = filteredPolls.filter(poll => poll.createdBy === createdBy);
    }

    // Sort by creation date (newest first)
    filteredPolls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: filteredPolls,
      count: filteredPolls.length
    });

  } catch (error) {
    console.error('Get polls error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching polls'
    });
  }
});

// Get poll by ID
router.get('/:id', async (req, res) => {
  try {
    const pollId = parseInt(req.params.id);
    const poll = polls.find(p => p._id === pollId);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    res.json({
      success: true,
      data: poll
    });

  } catch (error) {
    console.error('Get poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching poll'
    });
  }
});

// Vote on a poll
router.post('/:id/vote', async (req, res) => {
  try {
    const pollId = parseInt(req.params.id);
    const { optionId, userId } = req.body;

    if (!optionId) {
      return res.status(400).json({
        success: false,
        message: 'Option ID is required'
      });
    }

    const poll = polls.find(p => p._id === pollId);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    if (!poll.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Poll is not active'
      });
    }

    // Find the option
    const option = poll.options.find(opt => opt._id === optionId);

    if (!option) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option'
      });
    }

    // Increment vote count
    option.votes += 1;
    poll.totalVotes += 1;
    poll.updatedAt = new Date();

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        poll,
        votedOption: option
      }
    });

  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while recording vote'
    });
  }
});

// End a poll
router.put('/:id/end', async (req, res) => {
  try {
    const pollId = parseInt(req.params.id);
    const poll = polls.find(p => p._id === pollId);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    if (!poll.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Poll is already ended'
      });
    }

    // End the poll
    poll.isActive = false;
    poll.endedAt = new Date();
    poll.updatedAt = new Date();

    res.json({
      success: true,
      message: 'Poll ended successfully',
      data: poll
    });

  } catch (error) {
    console.error('End poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while ending poll'
    });
  }
});

// Get poll results
router.get('/:id/results', async (req, res) => {
  try {
    const pollId = parseInt(req.params.id);
    const poll = polls.find(p => p._id === pollId);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    // Calculate results
    const results = {
      pollId: poll._id,
      question: poll.question,
      totalVotes: poll.totalVotes,
      isActive: poll.isActive,
      options: poll.options.map(option => ({
        _id: option._id,
        text: option.text,
        votes: option.votes,
        percentage: poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0,
        isCorrect: option.isCorrect
      })),
      createdAt: poll.createdAt,
      endedAt: poll.endedAt
    };

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Get poll results error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching poll results'
    });
  }
});

// Delete a poll
router.delete('/:id', async (req, res) => {
  try {
    const pollId = parseInt(req.params.id);
    const pollIndex = polls.findIndex(p => p._id === pollId);

    if (pollIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    // Remove the poll
    polls.splice(pollIndex, 1);

    res.json({
      success: true,
      message: 'Poll deleted successfully'
    });

  } catch (error) {
    console.error('Delete poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting poll'
    });
  }
});

module.exports = router;
module.exports.polls = polls;
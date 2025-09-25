"use client";
import { useState, useEffect, useRef } from "react";
import { useSocket } from "../../../contexts/SocketContext";
import { createPoll } from '../../../lib/socket-simple';
import { useRouter } from "next/navigation";
import apiClient from "../../../lib/api";
import Link from "next/link";

export default function TeacherDashboard() {
  const { 
    socket, 
    isConnected, 
    activeUsers,
    messages,
    joinRoom
  } = useSocket();
  const router = useRouter();

  // Poll creation states
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false }
  ]);
  const [timer, setTimer] = useState(60);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null); // For showing queue feedback

  // Chat and UI states
  const [activeTab, setActiveTab] = useState("chat");
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);
  const [isClosingPopup, setIsClosingPopup] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentPoll, setCurrentPoll] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const popupRef = useRef(null);
  const chatIconRef = useRef(null);

  // Remove authentication checks - allow direct access
  useEffect(() => {
    // No authentication needed, just set loading to false
    setIsLoading(false);
  }, []);

  // Join the classroom room when socket is connected
  useEffect(() => {
    if (socket && isConnected && joinRoom) {
      console.log('Teacher joining classroom room...');
      
      // Join as teacher with temporary ID
      const tempUserId = `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      socket.emit('join', {
        userId: tempUserId,
        username: 'Teacher',
        role: 'teacher'
      });
      
      // Set up poll queue event listeners
      socket.on('poll_queued', (data) => {
        console.log('Poll queued:', data);
        setQueueStatus(data);
        // Clear queue status after 5 seconds
        setTimeout(() => {
          setQueueStatus(null);
        }, 5000);
      });
      
      // Then join the classroom room
      setTimeout(() => {
        joinRoom('classroom');
        console.log('Teacher joined classroom room');
      }, 100);
      
      // Cleanup function
      return () => {
        socket.off('poll_queued');
      };
    }
  }, [socket, isConnected, joinRoom]);

  // Load poll history on component mount
  useEffect(() => {
    const loadPollHistory = async () => {
      try {
        const response = await apiClient.getPollHistory();
        if (response.success) {
          console.log('Poll history loaded:', response.data);
        }
      } catch (error) {
        console.error('Error loading poll history:', error);
      }
    };

    loadPollHistory();
  }, []);

  // Update onlineUsers when activeUsers changes in socket context
  useEffect(() => {
    setOnlineUsers(activeUsers || []);
  }, [activeUsers]);

  // Update chat messages when socket messages change
  useEffect(() => {
    console.log('📨 Teacher - Messages from context changed:', messages);
    console.log('📨 Teacher - Current chatMessages:', chatMessages);
    if (messages) {
      setChatMessages(messages);
      console.log('📨 Teacher - Updated chatMessages to:', messages);
    }
  }, [messages]);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { text: "", isCorrect: false }]);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    console.log('handleCreatePoll called');
    console.log('Socket:', socket);
    console.log('isConnected:', isConnected);
    
    if (!question.trim()) {
      alert("Please enter a question");
      return;
    }

    const validOptions = options.filter(opt => opt.text.trim());
    if (validOptions.length < 2) {
      alert("Please provide at least 2 options");
      return;
    }

    const hasCorrectAnswer = validOptions.some(opt => opt.isCorrect);
    if (!hasCorrectAnswer) {
      alert("Please mark at least one correct answer");
      return;
    }

    setIsCreatingPoll(true);
    try {
      console.log('About to create poll...');
      if (socket && isConnected) {
        // Format data to match server expectations
        const pollData = {
          question: question.trim(),
          options: validOptions.map(opt => opt.text), // Server expects array of strings
          duration: timer,
          correctAnswer: validOptions.findIndex(opt => opt.isCorrect), // Server expects 0-based index
          room: 'classroom'
        };
        
        console.log('Creating poll with data:', pollData);
        createPoll(pollData);
        console.log('Poll created successfully');
        
        // Reset form
        setQuestion("");
        setOptions([
          { text: "", isCorrect: false },
          { text: "", isCorrect: false }
        ]);
        setTimer(60);
      } else {
        console.log('Cannot create poll - missing requirements:', {
          socket: !!socket,
          isConnected
        });
        alert('Not connected to server. Please refresh the page.');
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll. Please try again.');
    } finally {
      setIsCreatingPoll(false);
    }
  };

  const handleKickUser = (userId) => {
    if (!socket || !socket.connected) {
      alert('Not connected to server');
      return;
    }

    console.log('Attempting to kick user with ID:', userId);
    console.log('Available activeUsers:', activeUsers);

    // Find the user to get their username
    const userToKick = activeUsers.find(user => 
      user.userId === userId
    );
    
    if (!userToKick) {
      alert('User not found');
      console.log('User not found in activeUsers array');
      return;
    }

    const username = userToKick.username || userToKick.name || 'Unknown User';
    
    if (confirm(`Are you sure you want to kick ${username}?`)) {
      socket.emit('kick_participant', {
        userId: userId,
        username: username
      });
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && socket) {
      // Get teacher name from localStorage
      const teacherName = localStorage.getItem('teacherName') || 'Teacher';
      
      socket.emit('send_message', { 
        message: newMessage.trim(),
        username: teacherName
      });
      setNewMessage('');
    }
  };

  const handleEndPoll = async () => {
    if (!currentPoll) return;
    
    try {
      console.log('End poll functionality not implemented:', currentPoll._id);
      setCurrentPoll(null);
    } catch (error) {
      console.error('Error ending poll:', error);
    }
  };

  // Function to handle smooth popup closing with animation
  const handleClosePopup = () => {
    setIsClosingPopup(true);
    setTimeout(() => {
      setIsChatPopupOpen(false);
      setIsClosingPopup(false);
    }, 300); // Match animation duration
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        chatIconRef.current &&
        !chatIconRef.current.contains(event.target)
      ) {
        handleClosePopup();
      }
    };

    if (isChatPopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isChatPopupOpen]);

  // Add touch/swipe functionality for mobile
  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      // If swiping down more than 50px, close the popup
      if (deltaY > 50) {
        handleClosePopup();
        isDragging = false;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    if (isChatPopupOpen && popupRef.current) {
      const popup = popupRef.current;
      popup.addEventListener('touchstart', handleTouchStart);
      popup.addEventListener('touchmove', handleTouchMove);
      popup.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        popup.removeEventListener('touchstart', handleTouchStart);
        popup.removeEventListener('touchmove', handleTouchMove);
        popup.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isChatPopupOpen]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Poll History Button - Top Right */}
      <Link
        href="/teacher/poll-history"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] text-white px-3 py-2 sm:px-4 sm:py-2 rounded-full font-medium hover:bg-purple-700 transition-colors flex items-center space-x-1 sm:space-x-2 z-40 text-sm sm:text-base"
      >
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="hidden sm:inline">View Poll History</span>
        <span className="sm:hidden">History</span>
      </Link>

      <div className="w-full">
        <div className="text-left">
          {/* Intervue Poll Tag */}
          <div className="mb-6 sm:mb-8">
            <span className="inline-block text-white bg-gradient-to-r from-[#7565D9] to-[#4D0ACD] px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium">
              ✦ Intervue Poll
            </span>
          </div>

          {/* Main Title */}
          <div className="mb-8 w-[50%]">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Let's Get Started
            </h1>
            <p className="text-gray-600">
              you'll have the ability to create and manage polls, ask questions,
              and monitor your students' responses in real-time.
            </p>
          </div>

          {/* Poll Creation Form */}
          <div className="bg-gray-50 w-[80%] rounded-lg shadow-sm border border-gray-200 p-6 text-left">
            {/* Question Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Enter your question
                </label>
                {/* Timer Dropdown - Top Right of Message Box */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{timer} seconds</span>
                  <div className="relative">
                    <select
                      value={timer}
                      onChange={(e) => setTimer(parseInt(e.target.value))}
                      className="appearance-none bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm font-medium border-none focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                    >
                      <option value={30}>30s</option>
                      <option value={60}>60s</option>
                      <option value={90}>90s</option>
                      <option value={120}>2m</option>
                      <option value={180}>3m</option>
                    </select>
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                      <svg
                        className="w-3 h-3 text-purple-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your question here..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows="3"
                maxLength={500}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {question.length}/500
              </div>
            </div>

            {/* Options */}
            <div className="mb-6 w-[50%]">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Edit Options
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Is it Correct?
                </label>
              </div>

              <div className="space-y-3">
                {options.map((option, optionIndex) => (
                  <div
                    key={`create-option-${optionIndex}`}
                    className="flex items-center space-x-3"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-medium">
                      {optionIndex + 1}
                    </div>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) =>
                        updateOption(optionIndex, "text", e.target.value)
                      }
                      placeholder={`Option ${optionIndex + 1}`}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`correct-${optionIndex}`}
                          checked={option.isCorrect}
                          onChange={() => {
                            const newOptions = options.map((opt, i) => ({
                              ...opt,
                              isCorrect: i === optionIndex,
                            }));
                            setOptions(newOptions);
                          }}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-1 text-sm text-gray-600">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`correct-${optionIndex}`}
                          checked={!option.isCorrect}
                          onChange={() =>
                            updateOption(optionIndex, "isCorrect", false)
                          }
                          className="w-4 h-4 text-gray-400 focus:ring-gray-300"
                        />
                        <span className="ml-1 text-sm text-gray-600">No</span>
                      </label>
                    </div>
                    {options.length > 2 && (
                      <button
                        onClick={() => removeOption(optionIndex)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 6 && (
                <button
                  onClick={addOption}
                  className="mt-3 flex items-center text-purple-600 hover:text-purple-800 text-sm font-medium"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add More option
                </button>
              )}
            </div>

            {/* Ask Question Button */}
            <div className="flex justify-end">
              <button
                onClick={handleCreatePoll}
                disabled={
                  isCreatingPoll ||
                  !question.trim() ||
                  options.filter((opt) => opt.text.trim()).length < 2
                }
                className="bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] text-white rounded-full px-8 py-3 font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCreatingPoll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Ask Question</span>
                )}
              </button>
            </div>
            
            {/* Queue Status Feedback */}
            {queueStatus && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Poll Queued:</strong> {queueStatus.message}
                    </p>
                    {queueStatus.queuePosition > 1 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Position in queue: {queueStatus.queuePosition}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Current Poll Display */}
        {currentPoll && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 text-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-medium">{currentPoll.question}</p>
                {currentPoll.isActive && (
                  <button
                    onClick={handleEndPoll}
                    className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white transition-colors"
                  >
                    End Poll
                  </button>
                )}
              </div>
              {currentPoll.isActive && (
                <div className="mt-2 text-sm text-gray-300">
                  Active Poll • {currentPoll.totalVotes || 0} votes
                </div>
              )}
            </div>

            <div className="p-4">
              {currentPoll.options?.map((option, optionIndex) => {
                const percentage =
                  currentPoll.totalVotes > 0
                    ? (option.votes / currentPoll.totalVotes) * 100
                    : 0;
                return (
                  <div
                    key={
                      option._id ||
                      option.id ||
                      `poll-option-${
                        currentPoll._id || currentPoll.id
                      }-${optionIndex}`
                    }
                    className="relative mb-3 last:mb-0"
                  >
                    <div
                      className={`flex items-center p-3 rounded-lg border ${
                        option.isCorrect
                          ? "border-green-300 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-medium mr-4">
                        {optionIndex + 1}
                      </div>
                      <span className="text-gray-800 font-medium flex-1">
                        {option.text}
                        {option.isCorrect && (
                          <span className="ml-2 text-green-600 text-sm">
                            ✓ Correct
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-gray-600 ml-4">
                        {option.votes || 0} votes
                      </span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          option.isCorrect ? "bg-green-500" : "bg-purple-600"
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Icon + Popup */}
      <div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6"
        ref={chatIconRef}
      >
        {/* Chat Popup */}
        {isChatPopupOpen && (
          <div
            ref={popupRef}
            className={`absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 w-80 sm:w-92 max-w-[calc(100vw-2rem)] transform transition-all duration-300 ease-out ${
              isClosingPopup ? "animate-slide-down" : "animate-slide-up"
            }`}
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
              <h3 className="text-sm font-medium text-gray-700">
                Chat & Participants
              </h3>
              <button
                onClick={handleClosePopup}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex min-w-[25%] py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium justify-center ${
                  activeTab === "chat"
                    ? "text-purple-600 border-b-2 border-purple-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Chat ({chatMessages.length})
              </button>
              <button
                onClick={() => setActiveTab("participants")}
                className={`flex min-w-[25%] py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium justify-center ${
                  activeTab === "participants"
                    ? "text-purple-600 border-b-2 border-purple-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="hidden sm:inline">
                  Participants ({onlineUsers?.length || 0})
                </span>
                <span className="sm:hidden">
                  Users ({onlineUsers?.length || 0})
                </span>
              </button>
            </div>

            {/* Swipe indicator for mobile */}
            <div className="flex justify-center py-2 bg-gray-50">
              <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
            </div>
            {/* Content */}
            <div className="h-64 sm:h-80 overflow-hidden flex flex-col">
              {activeTab === "chat" ? (
                <>
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-gray-500 text-sm py-8">
                        No messages yet.
                      </div>
                    ) : (
                      chatMessages.map((message, messageIndex) => (
                        <div
                          key={
                            message._id ||
                            message.id ||
                            `message-${messageIndex}-${
                              message.timestamp || Date.now()
                            }`
                          }
                          className="flex flex-col"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${message.isSystem || message.messageType === 'system' ? 'text-orange-600' : 'text-gray-600'}`}>
                              {message.sender?.username ||
                                message.username ||
                                "Unknown User"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className={`rounded-lg p-2 text-sm ${message.isSystem || message.messageType === 'system' ? 'bg-orange-50 border border-orange-200 text-orange-800' : 'bg-gray-100'}`}>
                            {message.message ||
                              message.content ||
                              message.text ||
                              "No content"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="border-t p-3 sm:p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleSendMessage()
                        }
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 sm:p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2 sm:space-y-3">
                    {(onlineUsers?.length || 0) === 0 ? (
                      <div className="text-center text-gray-500 text-sm py-8">
                        No students connected yet.
                      </div>
                    ) : (
                      (onlineUsers || []).map(
                        (participant, participantIndex) => (
                          <div
                            key={
                              participant._id ||
                              participant.id ||
                              `participant-${participantIndex}-${
                                participant.username || "unknown"
                              }`
                            }
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs sm:text-sm font-medium">
                                  {(
                                    participant.username ||
                                    participant.name ||
                                    "U"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-gray-800">
                                {participant.username ||
                                  participant.name ||
                                  "Unknown User"}
                              </span>
                            </div>
                            <button
                              onClick={() => handleKickUser(participant.userId)}
                              className="text-red-500 hover:text-red-700 text-xs sm:text-sm px-2 py-1 rounded hover:bg-red-50"
                            >
                              Kick
                            </button>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Toggle Button */}
        <button
          onClick={() => setIsChatPopupOpen(!isChatPopupOpen)}
          className="bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] text-white rounded-full p-3 sm:p-4 shadow-lg hover:shadow-xl transition-all duration-200 relative"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {chatMessages.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-medium">
              {chatMessages.length > 9 ? "9+" : chatMessages.length}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

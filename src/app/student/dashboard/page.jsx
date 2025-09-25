"use client";
import { useState, useEffect, useRef } from "react";
import { useSocket } from "../../../contexts/SocketContext";
import { useRouter } from "next/navigation";
import apiClient from "../../../lib/api";

export default function StudentDashboard() {
  const { 
    socket, 
    isConnected, 
    currentPoll, 
    messages, 
    onlineUsers, 
    sendMessage, 
    votePoll, 
    joinRoom 
  } = useSocket();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('chat');
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [studentName, setStudentName] = useState("Student");
  const popupRef = useRef(null);
  const chatIconRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isKicked, setIsKicked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeEnded, setTimeEnded] = useState(false);
  const [isClosingPopup, setIsClosingPopup] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Name setup from localStorage
  useEffect(() => {
    // Get student name from localStorage
    const savedName = localStorage.getItem('studentName');
    if (savedName) {
      setStudentName(savedName);
    } else {
      // If no name found, redirect back to student page
      router.push('/student');
    }
  }, [router]);

  // Handle being kicked out - store temp user ID for identification
  const [tempUserId, setTempUserId] = useState(null);

  useEffect(() => {
    // Join the classroom when component mounts and we have a name
    if (socket && isConnected && studentName && studentName !== "Student") {
      // Generate temporary user ID once
      const userId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setTempUserId(userId);
      
      socket.emit('join', {
        userId: userId,
        username: studentName,
        role: 'student'
      });
      
      // Then join the classroom room after a small delay
      setTimeout(() => {
        joinRoom('classroom');
      }, 100);
    }
  }, [socket, isConnected, joinRoom, studentName]);

  // Handle poll timer
  useEffect(() => {
    if (currentPoll && currentPoll.isActive) {
      // Reset submission status when a new poll starts
      setHasSubmitted(false);
      setSelectedOption(null);
      setTimeEnded(false);
      
      const endTime = new Date(currentPoll.endTime);
      const now = new Date();
      const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remainingTime);

      if (remainingTime > 0) {
        const timer = setInterval(() => {
          const newEndTime = new Date(currentPoll.endTime);
          const newNow = new Date();
          const newRemainingTime = Math.max(0, Math.floor((newEndTime - newNow) / 1000));
          setTimeLeft(newRemainingTime);
          
          if (newRemainingTime <= 0) {
            setTimeEnded(true);
            clearInterval(timer);
          }
        }, 1000);

        return () => clearInterval(timer);
      } else {
        setTimeEnded(true);
      }
    }
  }, [currentPoll]);
  
  useEffect(() => {
    if (socket && tempUserId) {
      // Listen for the correct kick event from server
      socket.on('kicked_out', (data) => {
        console.log('Student received kicked_out event:', data);
        setIsKicked(true);
        setTimeout(() => {
          router.push('/student/kicked-out');
        }, 2000);
      });

      return () => {
        socket.off('kicked_out');
      };
    }
  }, [socket, tempUserId, router]);

  // Update chat messages when socket messages change
  useEffect(() => {
    console.log('📨 Messages from context changed:', messages);
    console.log('📨 Current chatMessages:', chatMessages);
    if (messages) {
      setChatMessages(messages);
      console.log('📨 Updated chatMessages to:', messages);
    }
  }, [messages]);

  // Handle popup close with animation
  const handleClosePopup = () => {
    setIsClosingPopup(true);
    setTimeout(() => {
      setIsChatPopupOpen(false);
      setIsClosingPopup(false);
    }, 200);
  };

  // Click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) &&
          chatIconRef.current && !chatIconRef.current.contains(event.target)) {
        handleClosePopup();
      }
    };

    if (isChatPopupOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isChatPopupOpen]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (isChatPopupOpen && popupRef.current) {
      const chatContainer = popupRef.current.querySelector('.overflow-y-auto');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [isChatPopupOpen, chatMessages]);

  const handleSubmit = () => {
    if (selectedOption && currentPoll && !hasSubmitted) {
      votePoll(currentPoll._id, selectedOption);
      setHasSubmitted(true);
      // Keep the selected option to show what was submitted
    }
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    console.log('🚀 Sending message:', newMessage.trim());
    console.log('🚀 Socket connected:', socket?.connected);
    if (newMessage.trim() && socket) {
      sendMessage(newMessage.trim());
      setNewMessage('');
      console.log('🚀 Message sent, input cleared');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If student is kicked out, show kicked message
  if (isKicked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-6">
            <span className="inline-block text-white bg-red-600 px-4 py-2 rounded-full text-sm font-medium">
              You have been removed from the session
            </span>
          </div>
          <p className="text-gray-700 text-lg font-medium">
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  // Show waiting screen if no active poll
  if (!currentPoll || !currentPoll.isActive) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          {/* Intervue Poll Tag */}
          <div className="mb-6 sm:mb-8">
            <span className="inline-block text-white bg-gradient-to-r from-[#7565D9] to-[#4D0ACD] px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium">
              ✦ Intervue Poll
            </span>
          </div>

          {/* Connection Status */}
          <div className="mb-4 sm:mb-6">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                isConnected
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              {isConnected ? "Connected" : "Connecting..."}
            </div>
          </div>

          {/* Loading Spinner */}
          <div className="mb-4 sm:mb-6">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>

          {/* Wait Message */}
          <p className="text-gray-700 text-base sm:text-lg font-medium px-4">
            Wait for the teacher to ask questions..
          </p>

          <p className="text-gray-500 text-sm mt-2">Welcome, {studentName}!</p>
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
                              <span className="text-xs font-medium text-gray-600">
                                {message.username || "Unknown User"}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(
                                  message.timestamp
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="bg-gray-100 rounded-lg p-2 text-sm">
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
                          No participants connected yet.
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
                              className="flex items-center space-x-2 sm:space-x-3"
                            >
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

  // Use the state variable instead of computed value
  // const timeEnded = timeLeft <= 0;

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-8 lg:py-12 relative px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Question Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
              Question 1
            </h1>
            <span
              className={`font-medium text-sm sm:text-base ${
                timeEnded ? "text-red-600" : "text-red-500"
              }`}
            >
              {timeEnded ? "Time Ended" : formatTime(timeLeft)}
            </span>
          </div>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 sm:mb-6">
          {/* Question Header with Dark Background */}
          <div className="bg-gray-800 text-white p-4">
            <h2 className="text-base sm:text-lg font-medium leading-relaxed">
              {currentPoll.question}
            </h2>
          </div>

          {/* Options Container */}
          <div className="p-4 sm:p-6">
            <div className="space-y-2 sm:space-y-3">
              {currentPoll.options.map((option, index) => {
                const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
                const label = optionLabels[index] || String.fromCharCode(65 + index);
                
                return (
                  <button
                    key={option._id}
                    onClick={() => !timeEnded && setSelectedOption(option._id)}
                    disabled={timeEnded}
                    className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all duration-200 text-sm sm:text-base ${
                      selectedOption === option._id
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : timeEnded
                        ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-25"
                    }`}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full mr-3 sm:mr-4 flex items-center justify-center text-xs sm:text-sm font-medium ${
                          selectedOption === option._id
                            ? "bg-purple-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {label}
                      </div>
                      <span className="flex-1">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Submit Button */}
            {!timeEnded && !hasSubmitted && (
              <button
                onClick={handleSubmit}
                disabled={!selectedOption}
                className={`w-full mt-4 sm:mt-6 py-3 sm:py-4 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 ${
                  selectedOption
                    ? "bg-gradient-to-r from-[#7565D9] to-[#4D0ACD] text-white hover:opacity-90 hover:shadow-lg"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Submit
              </button>
            )}

            {/* Submitted Status */}
            {!timeEnded && hasSubmitted && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-700 text-center font-medium text-sm sm:text-base">
                    Answer submitted! Wait for the next question.
                  </p>
                </div>
              </div>
            )}

            {timeEnded && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-center font-medium text-sm sm:text-base">
                  Time's up! Wait for the next question.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Icon + Popup */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6" ref={chatIconRef}>
        {/* Chat Popup */}
        {isChatPopupOpen && (
          <div
            ref={popupRef}
            className={`absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 w-80 sm:w-92 max-w-[calc(100vw-2rem)] transform transition-all duration-300 ease-out ${
              isClosingPopup ? 'animate-slide-down' : 'animate-slide-up'
            }`}
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
              <h3 className="text-sm font-medium text-gray-700">Chat & Participants</h3>
              <button
                onClick={handleClosePopup}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <span className="hidden sm:inline">Participants ({onlineUsers?.length || 0})</span>
                <span className="sm:hidden">Users ({onlineUsers?.length || 0})</span>
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
                        <div key={message._id || message.id || `message-${messageIndex}-${message.timestamp || Date.now()}`} className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${message.isSystem || message.messageType === 'system' ? 'text-orange-600' : 'text-gray-600'}`}>
                              {message.sender?.username || message.username || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className={`rounded-lg p-2 text-sm ${message.isSystem || message.messageType === 'system' ? 'bg-orange-50 border border-orange-200 text-orange-800' : 'bg-gray-100'}`}>
                            {message.message || message.content || message.text || 'No message content'}
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
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
                        No participants connected yet.
                      </div>
                    ) : (
                      (onlineUsers || []).map((participant, participantIndex) => (
                        <div
                          key={participant._id || participant.id || `participant-${participantIndex}-${participant.username || 'unknown'}`}
                          className="flex items-center space-x-2 sm:space-x-3"
                        >
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs sm:text-sm font-medium">
                              {(participant.username || participant.name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-gray-800">
                            {participant.username || participant.name || 'Unknown User'}
                          </span>
                        </div>
                      ))
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
              {chatMessages.length > 9 ? '9+' : chatMessages.length}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
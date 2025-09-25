"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "../../../lib/api";

export default function PollHistory() {
  const router = useRouter();
  const [pollHistory, setPollHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load real poll history from backend
  useEffect(() => {
    const loadPollHistory = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getPollHistory();
        
        if (response.success) {
          // Transform backend data to match UI expectations
          const transformedPolls = response.data.map((poll, index) => ({
            id: poll._id,
            question: poll.question,
            options: poll.options.map(option => ({
              text: option.text,
              votes: option.votes || 0,
              percentage: poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0,
              isCorrect: option.isCorrect || false
            })),
            totalVotes: poll.totalVotes || 0,
            correctAnswer: poll.options.find(opt => opt.isCorrect)?.text || "N/A",
            timestamp: new Date(poll.createdAt).toLocaleString(),
            isActive: poll.isActive
          }));
          
          setPollHistory(transformedPolls);
        } else {
          setError('Failed to load poll history');
        }
      } catch (error) {
        console.error('Error loading poll history:', error);
        setError('Failed to load poll history');
      } finally {
        setLoading(false);
      }
    };

    loadPollHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative">
      {/* Back to Dashboard Button */}
      <button
        onClick={() => router.push("/teacher/dashboard")}
        className="absolute top-4 right-4 bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
      >
        Back to Dashboard
      </button>

      <div className="w-full max-w-2xl mx-auto">
        <div className="text-left">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              View Poll History
            </h1>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading poll history...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && pollHistory.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No polls created yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first poll to see it appear here
              </p>
              <Link
                href="/teacher/dashboard"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Poll
              </Link>
            </div>
          )}

          {/* Poll History List */}
          {!loading && !error && pollHistory.length > 0 && (
            <div className="space-y-8">
              {pollHistory.map((poll, pollIndex) => (
                <div key={poll.id} className="text-left">
                  {/* Question Number */}
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Question {pollIndex + 1}
                  </h2>

                  {/* Question Header */}
                  <div className="bg-gray-800 text-white p-4 rounded-t-lg">
                    <h3 className="text-base font-medium">{poll.question}</h3>
                  </div>

                  {/* Poll Options and Results */}
                  <div className="bg-white border border-gray-200 rounded-b-lg p-4">
                    <div className="space-y-3">
                      {poll.options.map((option, index) => (
                        <div
                          key={`${poll.id}-option-${index}`}
                          className="flex items-center space-x-3"
                        >
                          {/* Option Number Circle */}
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-sm font-medium flex-shrink-0">
                            {index + 1}
                          </div>

                          {/* Option Text */}
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-900 font-medium">
                              {option.text}
                            </span>
                          </div>

                          {/* Percentage */}
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-700">
                              {option.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Correct Answer Display */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold">
                          ✓
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          Correct Answer: 
                        </span>
                        <span className="text-sm font-semibold text-green-700">
                          {poll.correctAnswer}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
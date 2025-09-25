"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function KickedOutPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Clear any existing student session data
    localStorage.removeItem('studentName');
    
    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Separate useEffect for handling redirect when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      router.push('/student');
    }
  }, [countdown, router]);

  const handleTryAgain = () => {
    // Clear session and redirect immediately
    localStorage.removeItem('studentName');
    router.push('/student');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="text-center max-w-lg mx-auto p-6 sm:p-8">
        {/* Intervue Poll Tag */}
        <div className="mb-6 sm:mb-8">
          <span className="inline-block text-white bg-gradient-to-r from-[#7565D9] to-[#4D0ACD] px-3 py-1 sm:px-4 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
            Intervue Poll
          </span>
        </div>

        {/* Kicked Out Icon */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Kicked Out Message */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
          You've been removed from the session
        </h1>

        <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed px-2 sm:px-0">
          The teacher has removed you from the poll system. You can try joining again with a new session.
        </p>

        {/* Countdown */}
        <div className="mb-6 sm:mb-8">
          <p className="text-sm text-gray-500 mb-4">
            Automatically redirecting in <span className="font-semibold text-purple-600">{countdown}</span> seconds
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${((10 - countdown) / 10) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Try Again Button */}
        <div className="mt-6 sm:mt-8">
          <button
            onClick={handleTryAgain}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 sm:px-8 sm:py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg text-sm sm:text-base"
          >
            Try Again Now
          </button>
        </div>
      </div>
    </div>
  );
}
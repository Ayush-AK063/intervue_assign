"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("student");

  const handleContinue = () => {
    if (selectedRole === "student") {
      router.push("/student");
    } else {
      router.push("/teacher");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Header Badge */}
      <div className="bg-gradient-to-r from-[#7565D9] to-[#4D0ACD] text-white px-4 py-2 rounded-full text-sm font-medium mb-8 sm:mb-12 flex items-center gap-2 shadow-lg">
        <span>✦</span>
        Intervue Poll
      </div>

      {/* Main Content */}
      <div className="text-center max-w-2xl">
        <h1 className="text-2xl sm:text-3xl lg:text-3xl text-gray-900 mb-4 leading-tight">
          Welcome to the{" "}
          <span className="text-transparent bg-clip-text bg-black font-bold">
            Live Polling System
          </span>
        </h1>

        <p className="text-sm sm:text-base text-gray-600 mb-8 sm:mb-10 leading-relaxed">
          Please select the role that best describes you to begin using the live
          polling system
        </p>

        {/* Role Selection Cards */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-8 sm:mb-10 justify-center items-stretch">
          {/* Student Card */}
          <div
            onClick={() => setSelectedRole("student")}
            className={`w-full sm:w-80 h-auto sm:h-36 p-4 sm:p-6 border-2 rounded-lg cursor-pointer text-left transition-all duration-300 hover:shadow-md flex flex-col ${
              selectedRole === "student"
                ? "border-indigo-500 bg-indigo-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              I'm a Student
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed flex-1">
              Lorem ipsum is simply dummy text of the printing and typesetting
              industry
            </p>
          </div>

          {/* Teacher Card */}
          <div
            onClick={() => setSelectedRole("teacher")}
            className={`w-full sm:w-80 h-auto sm:h-36 p-4 sm:p-6 border-2 rounded-lg cursor-pointer text-left transition-all duration-300 hover:shadow-md flex flex-col ${
              selectedRole === "teacher"
                ? "border-indigo-500 bg-indigo-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              I'm a Teacher
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed flex-1">
              Submit answers and view live poll results in real-time.
            </p>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-full text-sm transition-all duration-300 shadow-md hover:shadow-lg min-w-28"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

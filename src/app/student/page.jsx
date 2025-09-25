// app/student/page.js
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentPage() {
  const [name, setName] = useState("");
  const router = useRouter();

  const handleContinue = () => {
    if (name.trim()) {
      // Save student name to localStorage
      localStorage.setItem("studentName", name);
      router.push("/student/dashboard"); // redirect to student dashboard
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-xl text-center p-6">
        {/* Logo / Tag */}
        <span className="px-4 py-1 text-sm font-medium text-white bg-gradient-to-r from-[#7565D9] to-[#4D0ACD] rounded-full">
          ✦ Intervue Poll
        </span>

        {/* Heading */}
        <h1 className="mt-6 text-3xl  text-gray-900">
          Let's <span className="text-black font-bold">Get Started</span>
        </h1>
        <p className="mt-2 text-gray-500">
          If you're a student, you'll be able to{" "}
          <span className="font-semibold text-gray-700">
            submit your answers
          </span>
          , participate in live polls, and see how your responses compare with
          your classmates
        </p>

        {/* Name Input */}
        <div className="mt-8 flex justify-center">
          <div className="text-left max-w-sm w-full">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Enter your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name..."
              className="w-full p-3 border rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Continue Button */}
        <button
          disabled={!name.trim()}
          onClick={handleContinue}
          className={`mt-8 px-16 py-3 rounded-full font-medium text-white 
            ${
              name.trim()
                ? "bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] hover:bg-purple-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

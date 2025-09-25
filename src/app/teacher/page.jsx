"use client";
import { useRouter } from "next/navigation";

export default function TeacherPage() {
  const router = useRouter();

  const handleContinue = () => {
    // Directly navigate to teacher dashboard
    router.push('/teacher/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md text-center p-6">
        {/* Logo / Tag */}
        <span className="px-4 py-1 text-sm font-medium text-white bg-gradient-to-r from-[#7565D9] to-[#4D0ACD] rounded-full">
          ✦ Intervue Poll
        </span>

        {/* Heading */}
        <h1 className="mt-6 text-3xl text-gray-900">
          Teacher Dashboard
        </h1>
        <p className="mt-2 text-gray-500">
          Access your teacher dashboard to create polls and manage your classroom
        </p>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full mt-8 px-6 py-3 rounded-full font-medium text-white bg-gradient-to-r from-[#8F64E1] to-[#1D68BD] hover:opacity-90"
        >
          Continue to Dashboard
        </button>

        {/* Back to Home */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

// Zealtho - Refer and Earn Page (placeholder)
// Will be fully developed later. For now, a welcome message.

export default function ReferAndEarnPage() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center bg-white px-5">
      <div className="max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 mb-6 shadow-[0_10px_40px_rgba(249,115,22,0.35)]">
          <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#0F2C3D] mb-3">
          Welcome to <span className="text-orange-500">Refer & Earn</span>
        </h1>
        <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
          Share wellness with your friends and earn rewards together. 
          Full referral program coming soon — check back shortly!
        </p>
      </div>
    </section>
  );
}
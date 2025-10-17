import React from 'react';

const Hero = () => {
  return (
    <section id="home" className="relative flex flex-col justify-center items-center text-center h-screen px-6">
      {/* Heading */}
      <h1 className="text-5xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#5C3AFF] to-[#00FFC6]">
        AI-Powered Material Forecasting
      </h1>

      {/* Subtext */}
      <p className="text-xl md:text-2xl mb-8 max-w-xl text-gray-100">
        Predict, plan, and procure smarter 💡. Reduce waste, optimize supply chains, and make sustainable infrastructure decisions 
      </p>

      {/* CTA Buttons */}
      <div className="flex gap-4">
        <a 
          href="/login" 
          className="px-8 py-4 bg-gradient-to-r from-[#5C3AFF] to-[#00FFC6] text-white rounded-full font-semibold hover:scale-105 transition transform shadow-lg hover:shadow-[#5C3AFF]/50"
        >
          Get Started
        </a>
        <a 
          href="#features" 
          className="px-8 py-4 border-2 border-[#5C3AFF] text-[#5C3AFF] rounded-full font-semibold hover:bg-gradient-to-r hover:from-[#5C3AFF] hover:to-[#00FFC6] hover:text-white transition transform hover:scale-105 shadow hover:shadow-[#5C3AFF]/50"
        >
          Learn More
        </a>
      </div>

      {/* Feature teaser */}
      <div className="mt-12 flex gap-8 text-gray-100">
        <span>📈 Accurate AI Predictions</span>
        <span>♻️ Sustainable & Efficient</span>
        <span>⚡ Real-Time Insights</span>
      </div>
    </section>
  );
};

export default Hero;
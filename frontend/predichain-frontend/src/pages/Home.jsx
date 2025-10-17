import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import FeatureCard from '../components/FeatureCard';
import BenefitCard from '../components/BenefitCard';
import Footer from '../components/Footer';
import LiquidEther from '../components/LiquidEther';
import { FaUpload, FaChartLine, FaRecycle, FaLightbulb, FaShieldAlt } from 'react-icons/fa';
import { FaBoxes, FaMoneyBillWave } from 'react-icons/fa';

const Home = () => {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* 🔮 Full-page Liquid Ether Background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <LiquidEther
          colors={['#5C3AFF', '#A883FF', '#D8C0FF']}
          mouseForce={20}
          cursorSize={50}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>

      {/* 🌈 Foreground content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Navbar />
        <Hero />

        {/* About Section */}
        <section className="py-20 px-8 bg-opacity-80 backdrop-blur-md text-center text-white">
          <h2 className="text-4xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-300">
            About PrediChain
          </h2>
          <p className="max-w-3xl mx-auto text-lg leading-relaxed opacity-90">
            <strong>PrediChain</strong> is an AI-driven platform designed to forecast material demand for
            large-scale civil infrastructure projects. Using a <span className="text-indigo-300 font-medium">hybrid model (Prophet + LSTM)</span>,
            it analyzes historical data, weather patterns, and supplier trends to deliver precise,
            actionable insights for smarter procurement and sustainable construction.
          </p>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-6 bg-opacity-80 backdrop-blur-md">
          <h2 className="text-4xl font-extrabold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-300">
            How PrediChain Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={<FaUpload />}
              title="Upload Project Data"
              description="Easily import project logs, supplier info, and environmental factors for AI processing."
            />
            <FeatureCard
              icon={<FaChartLine />}
              title="Predict Material Demand"
              description="Our hybrid ML model generates accurate forecasts of upcoming material requirements."
            />
            <FeatureCard
              icon={<FaRecycle />}
              title="Optimize Procurement"
              description="Gain insights to minimize over-ordering, reduce waste, and achieve sustainability goals."
            />
          </div>
        </section>

        {/* Why PrediChain Section */}
        <section className="py-20 px-6 bg-opacity-80 backdrop-blur-md text-center text-white">
          <h2 className="text-4xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-300">
            Why Choose PrediChain?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
            <FeatureCard
              icon={<FaLightbulb />}
              title="Explainable AI Insights"
              description="Get transparency into predictions with explainable AI visualizations and analytics."
            />
            <FeatureCard
              icon={<FaShieldAlt />}
              title="Data Privacy First"
              description="Your data is encrypted and securely handled, ensuring complete confidentiality."
            />
            <FeatureCard
              icon={<FaChartLine />}
              title="Sustainability Dashboard"
              description="Monitor environmental impact and track sustainable usage of materials in real time."
            />
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="py-20 px-6 bg-opacity-80 backdrop-blur-md">
          <h2 className="text-4xl font-extrabold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-300">
            Key Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <BenefitCard
              icon={<FaRecycle className="text-4xl text-[#4B86B4] mb-3" />}
              title="Material Waste Reduction"
              value="25%"
              description="Cut down unnecessary material usage with precise forecasts and smart planning."
            />
            <BenefitCard
              icon={<FaBoxes className="text-4xl text-[#4B86B4] mb-3" />}
              title="Procurement Efficiency"
              value="+10%"
              description="Procure materials faster and smarter by predicting project needs in advance."
            />
            <BenefitCard
              icon={<FaMoneyBillWave className="text-4xl text-[#4B86B4] mb-3" />}
              title="Project Cost Savings"
              value="₹2.4L"
              description="Save money by optimizing resource allocation and reducing overruns."
            />
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Home;
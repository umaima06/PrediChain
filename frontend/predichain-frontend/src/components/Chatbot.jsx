import React from "react";

const Chatbot = () => {
  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-gray-900/90 rounded-xl shadow-[0_0_30px_5px_rgba(92,58,255,0.5)] p-3 flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[#5C3AFF] font-semibold">Chatbot</span>
        <button className="text-gray-200 hover:text-[#A883FF]">×</button>
      </div>
      <div className="flex-1 bg-gray-800/60 rounded-md p-2 overflow-y-auto text-gray-200">
        {/* Messages will go here */}
      </div>
      <input
        type="text"
        placeholder="Type a question..."
        className="mt-2 w-full rounded-md px-2 py-1 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5C3AFF]"
      />
    </div>
  );
};

export default Chatbot;
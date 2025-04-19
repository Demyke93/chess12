
import React from 'react';

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="text-center bg-white p-8 rounded-xl shadow-2xl transform transition-all hover:scale-105">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
          Hello, World!
        </h1>
        <p className="text-xl text-gray-700">
          Welcome to your Lovable React application
        </p>
      </div>
    </div>
  );
};

export default Index;

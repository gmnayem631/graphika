import React from "react";

const HomePage = () => {
  return (
    <main className="h-full flex justify-center items-center flex-col gap-4">
      <h1 className="text-xl font-bold">Home Page</h1>
      <button className="btn px-4 py-2 bg-blue-500 rounded cursor-pointer hover:bg-blue-700">
        Text Button
      </button>
    </main>
  );
};

export default HomePage;

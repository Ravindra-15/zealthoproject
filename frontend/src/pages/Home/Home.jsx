// src/pages/Home/Home.jsx

import React, { useState, useEffect } from "react";
import Navbar from "../../components/layout/Navbar";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";

const Home = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show modal after entering home
    setOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f3ef]">

      <Navbar />

      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold text-teal-800">
          Welcome to Zealtho
        </h1>
      </div>

      {/* Modal */}
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div className="text-center">

          <h2 className="text-xl font-semibold text-teal-800 mb-4">
            Welcome to Zealtho
          </h2>

          <img
            src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png"
            alt="welcome"
            className="w-32 mx-auto mb-4"
          />

          <Button text="Book Doctor Consultation" />

          <p className="text-xs text-gray-500 mt-3">
            🔥 10K Users Already Registered
          </p>

        </div>
      </Modal>

    </div>
  );
};

export default Home;
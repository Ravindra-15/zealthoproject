import React from "react";
import SettingsHeader from "./components/SettingsHeader";
import IdentityCard from "./components/IdentityCard";
import PasswordCard from "./components/PasswordCard";

const Settings = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto w-full">
      <SettingsHeader />

      <div className="space-y-6">
        <IdentityCard />
        <PasswordCard />
      </div>
    </div>
  );
};

export default Settings;
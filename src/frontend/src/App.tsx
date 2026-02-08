import { useState } from 'react'
import './index.css'
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { SettingsModule } from './components/SettingsModule';
import { ToolsModule } from './components/ToolsModule';

function App() {
  const [activeTab, setActiveTab] = useState('Tools');
  const tabs = ['Tools', 'Settings'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <Header />
      <main className="flex-1 p-4 overflow-y-auto">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-2">
          {activeTab === 'Settings' && <SettingsModule />}
          {activeTab === 'Tools' && <ToolsModule />}
        </div>
      </main>
      <footer className="p-3 text-center text-xs text-gray-400 border-t border-gray-200">
        &copy; 2026 Keywords Automation
      </footer>
    </div>
  )
}

export default App

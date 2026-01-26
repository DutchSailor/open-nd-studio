import { useState } from 'react';
import { DraftsTab } from './DraftsTab';
import { SheetsTab } from './SheetsTab';

type Tab = 'drafts' | 'sheets';

export function NavigationPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('drafts');

  return (
    <div className="w-48 flex flex-col bg-cad-bg border-r border-cad-border">
      {/* Tab Headers */}
      <div className="flex border-b border-cad-border">
        <button
          onClick={() => setActiveTab('drafts')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'drafts'
              ? 'bg-cad-bg-light text-cad-text border-b-2 border-cad-accent'
              : 'text-cad-text-dim hover:text-cad-text hover:bg-cad-border/30'
          }`}
        >
          Drafts
        </button>
        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'sheets'
              ? 'bg-cad-bg-light text-cad-text border-b-2 border-cad-accent'
              : 'text-cad-text-dim hover:text-cad-text hover:bg-cad-border/30'
          }`}
        >
          Sheets
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'drafts' && <DraftsTab />}
        {activeTab === 'sheets' && <SheetsTab />}
      </div>
    </div>
  );
}

import type { TabType } from '../../types/performance';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'table', label: 'Events Table' },
    { id: 'resources', label: 'Resources' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '0',
      borderBottom: '1px solid #333',
      backgroundColor: '#202020',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '12px 24px',
            border: 'none',
            backgroundColor: activeTab === tab.id ? '#252525' : '#202020',
            color: activeTab === tab.id ? '#fff' : '#888',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            borderBottom: activeTab === tab.id ? '2px solid #4ECDC4' : '2px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}


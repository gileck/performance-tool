interface PlaceholderPanelProps {
  message?: string;
}

export function PlaceholderPanel({ message = 'More performance insights coming soon...' }: PlaceholderPanelProps) {
  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      padding: '24px',
      border: '1px solid #333',
      textAlign: 'center',
      color: '#666',
    }}>
      <div style={{ fontSize: '14px' }}>
        {message}
      </div>
    </div>
  );
}


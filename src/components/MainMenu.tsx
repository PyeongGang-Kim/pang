interface Props {
  onStart: () => void;
}

export function MainMenu({ onStart }: Props) {
  const hiScore = Number(localStorage.getItem('hiScore') || 0);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>PANG</h1>
      <p style={styles.hiScore}>HI-SCORE &nbsp; {hiScore.toLocaleString()}</p>
      <button style={styles.button} onClick={onStart}>
        GAME START
      </button>
      <p style={styles.hint}>← → 이동 &nbsp;|&nbsp; SPACE 와이어 발사</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  title: {
    fontSize: '96px',
    margin: 0,
    color: '#f1c40f',
    textShadow: '4px 4px 0 #b7950b, 0 0 40px rgba(241,196,15,0.6)',
    letterSpacing: '12px',
  },
  hiScore: {
    fontSize: '18px',
    margin: 0,
    color: '#aaa',
    letterSpacing: '2px',
  },
  button: {
    fontSize: '22px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    padding: '14px 40px',
    background: 'transparent',
    color: '#f1c40f',
    border: '2px solid #f1c40f',
    cursor: 'pointer',
    letterSpacing: '3px',
    transition: 'background 0.15s, color 0.15s',
  },
  hint: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
};

interface Props {
  score: number;
  hiScore: number;
  onBack: () => void;
}

export function GameOver({ score, hiScore, onBack }: Props) {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>GAME OVER</h1>
      <p style={styles.row}>SCORE &nbsp;&nbsp; {score.toLocaleString()}</p>
      <p style={styles.row}>HI-SCORE &nbsp; {hiScore.toLocaleString()}</p>
      <button style={styles.button} onClick={onBack}>
        BACK TO MENU
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  title: {
    fontSize: '64px',
    margin: 0,
    color: '#e74c3c',
    textShadow: '3px 3px 0 #922b21',
    letterSpacing: '6px',
  },
  row: {
    fontSize: '20px',
    margin: 0,
    color: '#ccc',
    letterSpacing: '2px',
  },
  button: {
    marginTop: '10px',
    fontSize: '18px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    padding: '12px 32px',
    background: 'transparent',
    color: '#e74c3c',
    border: '2px solid #e74c3c',
    cursor: 'pointer',
    letterSpacing: '2px',
  },
};

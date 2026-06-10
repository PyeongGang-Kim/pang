import { useState } from 'react';
import type { GameScreen } from './game/types';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { GameOver } from './components/GameOver';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [finalScore, setFinalScore] = useState(0);
  const [finalHiScore, setFinalHiScore] = useState(0);

  function handleGameEnd(score: number, hiScore: number) {
    setFinalScore(score);
    setFinalHiScore(hiScore);
    setScreen('gameOver');
  }

  return (
    <div style={containerStyle}>
      {screen === 'menu' && (
        <MainMenu onStart={() => setScreen('playing')} />
      )}
      {screen === 'playing' && (
        <GameCanvas onGameEnd={handleGameEnd} />
      )}
      {screen === 'gameOver' && (
        <GameOver score={finalScore} hiScore={finalHiScore} onBack={() => setScreen('menu')} />
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#000',
};

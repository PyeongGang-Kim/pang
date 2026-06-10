import { useState } from 'react';
import type { GameScreen } from './game/types';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { GameOver } from './components/GameOver';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [score] = useState(0);
  const hiScore = Number(localStorage.getItem('hiScore') || 0);

  return (
    <div style={containerStyle}>
      {screen === 'menu' && (
        <MainMenu onStart={() => setScreen('playing')} />
      )}
      {screen === 'playing' && (
        <GameCanvas onGameEnd={() => setScreen('gameOver')} />
      )}
      {screen === 'gameOver' && (
        <GameOver score={score} hiScore={hiScore} onBack={() => setScreen('menu')} />
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

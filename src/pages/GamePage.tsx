import { useParams, Navigate } from 'react-router-dom';
import { getGame } from '../games/registry';
import { GameShell } from '../components/GameShell';
import type { ModuleKey } from '../games/types';

/**
 * GamePage —— 游戏页：根据 gameId 从注册表取 GameConfig，加载 GameShell。
 * 找不到对应游戏时回退首页。
 */
export function GamePage() {
  const { module, gameId } = useParams();
  const game = getGame(gameId);

  if (!game || game.module !== (module as ModuleKey)) {
    return <Navigate to="/" replace />;
  }

  return <GameShell config={game} />;
}

export default GamePage;

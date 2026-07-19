import ModuleGameRunner from '@/games/ModuleGameRunner';
import { mathGames } from '@/games/registries/math';
import './index.css';

/**
 * math 模块分包入口页。
 *
 * URL: /packages/math/pages/game/index?gameId=xxx
 * 通过 query 参数 gameId 路由到具体游戏。
 * 此分包只含 math 模块的游戏代码，主包不引入。
 */
export default function MathGamePage() {
  return <ModuleGameRunner games={mathGames} />;
}

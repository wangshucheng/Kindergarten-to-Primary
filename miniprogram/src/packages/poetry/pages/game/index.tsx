import ModuleGameRunner from '@/games/ModuleGameRunner';
import { poetryGames } from '@/games/registries/poetry';
import './index.css';

/**
 * poetry 模块分包入口页。
 *
 * URL: /packages/poetry/pages/game/index?gameId=xxx
 * 通过 query 参数 gameId 路由到具体游戏。
 * 此分包只含 poetry 模块的游戏代码，主包不引入。
 */
export default function PoetryGamePage() {
  return <ModuleGameRunner games={poetryGames} />;
}

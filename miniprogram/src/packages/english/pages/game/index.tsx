import ModuleGameRunner from '@/games/ModuleGameRunner';
import { englishGames } from '@/games/registries/english';
import './index.css';

/**
 * english 模块分包入口页。
 *
 * URL: /packages/english/pages/game/index?gameId=xxx
 * 通过 query 参数 gameId 路由到具体游戏。
 * 此分包只含 english 模块的游戏代码，主包不引入。
 */
export default function EnglishGamePage() {
  return <ModuleGameRunner games={englishGames} />;
}

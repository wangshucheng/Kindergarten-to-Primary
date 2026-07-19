import ModuleGameRunner from '@/games/ModuleGameRunner';
import { hanziGames } from '@/games/registries/hanzi';
import './index.css';

/**
 * hanzi 模块分包入口页。
 *
 * URL: /packages/hanzi/pages/game/index?gameId=xxx
 * 通过 query 参数 gameId 路由到具体游戏。
 * 此分包只含 hanzi 模块的游戏代码，主包不引入。
 */
export default function HanziGamePage() {
  return <ModuleGameRunner games={hanziGames} />;
}

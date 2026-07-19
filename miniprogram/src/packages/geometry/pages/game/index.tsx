import ModuleGameRunner from '@/games/ModuleGameRunner';
import { geometryGames } from '@/games/registries/geometry';
import './index.css';

/**
 * geometry 模块分包入口页。
 *
 * URL: /packages/geometry/pages/game/index?gameId=xxx
 * 通过 query 参数 gameId 路由到具体游戏。
 * 此分包只含 geometry 模块的游戏代码，主包不引入。
 */
export default function GeometryGamePage() {
  return <ModuleGameRunner games={geometryGames} />;
}

import ModuleGameRunner from '@/games/ModuleGameRunner';
import { pinyinGames } from '@/games/registries/pinyin';
import './index.css';

/**
 * pinyin 模块分包入口页。
 *
 * URL: /packages/pinyin/pages/game/index?gameId=xxx
 * 通过 query 参数 gameId 路由到具体游戏。
 * 此分包只含 pinyin 模块的游戏代码，主包不引入。
 */
export default function PinyinGamePage() {
  return <ModuleGameRunner games={pinyinGames} />;
}

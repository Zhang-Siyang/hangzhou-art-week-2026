# 来都来了 · 杭州艺术周散步地图

**在线使用：[hangzhou-art-week-2026.pages.dev](https://hangzhou-art-week-2026.pages.dev/)**

面向观众的 2026 杭州艺术周游玩指南。将展览、对谈、工作坊与免费艺术大巴放在同一张 OpenStreetMap 地图上，帮助安排一天的行程。

## 功能

- 156 项活动、78 家机构的地图与清单，支持关键词、日期、类型、区域等筛选。
- 按结束日期排除活动：截止日期默认是北京时间今天加 3 天，适用于全部活动类型，也可自行调整。
- 点位聚合、同一场馆多活动列表、收藏与“不感兴趣”；个人选择保存在当前浏览器。
- 5 条艺术大巴线路、站点、时刻表与上车说明。连线仅示意站点关系，不用于导航。
- 电脑端并排查看介绍与海报，手机端可切换或滑动查看。
- 集章模式：纸册 1–80 号地点、区域与盖章状态筛选、本地盖章记录；独立于活动日期和屏蔽条件。78 处有参考坐标，2 处按纸册地址提供导航搜索。

## 本地运行

纯静态 HTML、CSS、JavaScript，使用 Leaflet，无需 API Key、后端或构建步骤。

```sh
python3 -m http.server 8765 --directory dist
```

打开 http://localhost:8765 。底图需要联网；地理定位等功能需要 localhost 或 HTTPS。

## 项目结构

- `dist/index.html`：页面结构。
- `dist/style.css`：响应式样式。
- `dist/app.js`：地图、筛选、详情及本地收藏和屏蔽。
- `dist/data.js`：活动与场馆数据，包含对应海报与来源链接。
- `dist/bus.js`：大巴线路、站点与时刻表。
- `dist/guide.js`：游玩补充说明。
- `dist/stamps-data.js`：纸册 80 个地点、编号、地址与场馆关联。
- `dist/stamps-ui.js`：集章模式、地点详情和本地进度。
- `tests/`：地图弹窗、日期筛选与集章功能的浏览器回归测试。
- `dist/assets/`：活动海报、站点图片与 Leaflet。

修改后直接发布 `dist` 目录。Cloudflare Pages 无需构建命令，输出目录为 `dist`。现有站点使用 Direct Upload；更新时上传 `dist` 内容或通过 Wrangler 部署：

```sh
npx wrangler pages deploy dist --project-name hangzhou-art-week-2026
```

## 数据说明

活动资料来自五篇官方文章及小程序公开内容，整理截至 2026 年 11 月 7 日；集章地点于 11 月 8 日据纸册原图补充。活动不是实时同步；出发前请核对馆方预约与开放通知。欢迎通过 Issues 提交纠错，附上对应官方信息更便于核对。

- 已纳入城心跨江线「浙江美术馆站取消」的补充通知；不是整条线路取消。
- 坐标用于游玩参考。官方 GCJ-02 坐标转换为 WGS84 后显示在 OSM 上。余杭桉画廊、园区内部分活动使用附近参考点，入口请以地址及现场指引为准。
- 有冲突的展期、时间、地点以简短到访提醒保留。免费筛选仅包含明确免费参与的项目。
- 活动介绍为资料整理，不是逐字转录；详情保留原海报供核对。2026 年 11 月的文案复核清除了整理过程备注、重复描述，并修正了已核对的误字。

## 第三方资料

项目暂未选择代码许可证。活动海报、摄影、文字及其他第三方资料的权利归原作者或主办方，不因公开仓库而改变。Leaflet 的许可证保留于 `dist/assets/LEAFLET-LICENSE.txt`。

地图保留 OpenStreetMap 署名，并遵循其[瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/)。

## 集章数据与测试

集章地点以纸册为准，不借用场馆在别处举办的活动坐标。浙江美术馆使用已有大巴资料中的附近参考点；D&A Lab 与 cháo 美术馆尚未核实坐标，保留在完整清单中，提供地址导航搜索。纸册没有提供完整盖章、兑换规则，因此未推定奖品、门槛或兑换条件。个人勾选仅作备忘。

安装 Playwright 后运行：

```sh
node tests/map-regressions.cjs
node tests/stamps.cjs
```

可通过 `CHROME_EXECUTABLE` 指定本机 Chromium 路径。测试使用本地文件并拦截外部底图请求，不依赖瓦片网络可用性。

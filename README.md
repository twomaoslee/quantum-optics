# 量子光学课程网站

学生入口为 `dist/index.html`，当前发布第一、二讲在线讲义、课堂课件与课件 PDF，以及16讲目录、补充阅读与来源。第二讲已获教师明确发布授权。

`publication.json` 控制允许发布的讲次，不能根据源文件存在与否自动发布。第一、二讲已列入 `published_lectures`；后续讲次须在教师明确要求发布后加入。

本目录是独立的发布项目；课程写作继续使用相邻的 `quantum-notes/` 和 `quantum-slides/`。网站构建不重新渲染课程，也不修改课程原稿。修订原稿后先用课程已有流程更新 HTML，再运行：

```sh
python3 scripts/build.py
python3 scripts/check.py
```

如果本目录移出课程工作区，构建时指定课程位置：

```sh
python3 scripts/build.py --source-root /path/to/course
```

`index.template.html` 与 `site.css` 控制首页；`scripts/build.py` 汇集已渲染资料并从 `outline.qmd` 提取目录。新增讲次时扩展构建脚本中的资料配置。生成结果保存在 `dist/`，该目录需要提交到发布仓库。CI 仅核查并发布 `dist`，不依赖本地课程目录或 Quarto 安装。

## GitHub Pages

发布仓库为 [twomaoslee/quantum-optics](https://github.com/twomaoslee/quantum-optics)，与个人主页仓库 `twomaoslee/twomaoslee.github.io` 分开。课程地址为 https://zimin.li/quantum-optics/ ，发布结果以仓库 Actions 中最新运行记录为准。

1. 在 GitHub 建立独立课程仓库，提交本目录（包括 `dist`）。
2. 仓库 Settings → Pages → Source 选择 GitHub Actions。
3. 使用 `.github/workflows/pages.yml` 发布；以后推送 main 自动更新。
4. 核对实际部署地址和域名继承。目标为 `https://zimin.li/quantum-optics/`，不要添加指向 zimin.li 的课程 CNAME。
5. 部署成功后再在个人主页添加课程链接，并检查校园网、手机网络下的公式、媒体与外部实验。

工作流依照 GitHub 官方说明：
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 发布版处理

- 排除历史备份、QA、Python 绘图脚本、提示词和压缩包；保留来源署名与运行所需资产。
- 从学生页面去掉内部核验记录入口；原稿不变。
- 补齐第一讲视频海报缺失的输出副本。
- 每个讲义页面提供返回课程首页的入口。
- 课件 PDF：第一讲49页、第二讲43页；在线讲义另设入口。
- 网站不提供尚未制作的长文讲义 PDF 下载。

## 验证范围

`check.py` 检查所有 HTML/CSS 中静态本地引用、入口、子目录可迁移性与单文件大小；不将第三方站点的当前可达性当作已验证。浏览器验收记录保留于内部 qa 目录，不部署。

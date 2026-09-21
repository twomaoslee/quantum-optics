# 课程网站

此目录负责学生发布网站，课程正文继续在上一级 quantum-notes 和 quantum-slides 中编辑。
运行 `python3 scripts/build.py` 从已有 HTML 同步网站；不直接编辑 dist 内的生成页面。
首页沿用蓝白课程风格。以实际存在的资料显示入口，不添加未完成的 PDF、讲次或失效下载。
不得发布 archive、qa、教师讲授提示、审查记录和本地绝对路径。发布前执行 scripts/check.py。
GitHub Pages 计划使用独立 quantum-optics 仓库，不在此处写 CNAME，不覆盖个人网站。

发布许可独立于资料是否已写好：以 publication.json 的 published_lectures 为准。目前第一、二讲已获教师明确发布授权；后续讲次须另行授权。未发布讲次的正文、课件、专属素材与搜索条目均不得进入 dist，目录可以保留标题和“授课后发布”状态。本地备课文件不删除。

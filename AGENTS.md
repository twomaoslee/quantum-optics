# 课程网站

此目录负责学生发布网站，课程正文继续在上一级 quantum-notes 和 quantum-slides 中编辑。
运行 `python3 scripts/build.py` 从已有 HTML 同步网站；不直接编辑 dist 内的生成页面。
首页沿用蓝白课程风格。以实际存在的资料显示入口，不添加未完成的 PDF、讲次或失效下载。
不得发布 archive、qa、教师讲授提示、审查记录和本地绝对路径。发布前执行 scripts/check.py。
GitHub Pages 计划使用独立 quantum-optics 仓库，不在此处写 CNAME，不覆盖个人网站。

发布许可独立于资料是否已写好：以 publication.json 的 published_lectures 为准。目前第一至三讲全部资料、第四讲讲义、课堂课件及其互动资源已获教师明确发布授权；第四讲完整课件 PDF 已于2026-10-12获教师明确授权发布（使用 --update-pdfs 4 更新）。教师随后明确要求网站与前几讲保持一致，只发布完整课件 PDF；九宫格打印版仅保留在本地，不上传网站。published_pdf_lectures 单独控制 PDF 范围，standalone_notes_lectures 标记独立讲义构建方式，后续新讲次的首次发布须另行授权。教师已于2026-10-12明确要求：对已经发布的讲义和课件，后续修改在检查完成后同步线上，不必逐次询问。每次同时核对配套互动资源、目录与搜索索引。未发布讲次的正文、课件、专属素材与搜索条目均不得进入 dist，目录可以保留标题和“授课后发布”状态。本地备课文件不删除。

教师于2026-10-18明确授权第五讲讲义首次发布，包括正文图片与两处互动；暂不发布第五讲课件和PDF。第五讲在 publication.json 中列入 published_lectures、notes_only_lectures 和 standalone_notes_lectures，standalone_notes_sources 指向 quantum-notes/drafts/lecture05-study/lecture05.html。使用 scripts/build.py --update-notes 5 定向更新，保留其他已发布正文并同步首页、共享目录与搜索。注释排查副本不得发布。

教师于2026-10-19明确授权第五讲课件及配套互动首次上传课程网站，并要求移除有效区域灰色审阅边框。第五讲不再列入 notes_only_lectures，使用 scripts/build.py --update-slides 5 定向发布；PDF仍未授权。交付清单中的源稿、构建脚本与内部审查记录不属于公开资源。

教师于2026-10-19明确授权导出并发布第五讲课件PDF。标准版一页一张，包含53张主讲页及3张补充页，共56页；两处互动使用核对后的静态结果，合并教学分步。使用 scripts/build.py --update-pdfs 5 发布至下载区；九宫格不在本次发布范围。

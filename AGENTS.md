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

教师于2026-10-25明确授权第六讲课件首次发布，含44张主讲页、3张补充页和两处内嵌互动。本次只发布课件，讲义与PDF不在范围内。publication.json 的 slides_only_lectures 单独列出第六讲；published_lectures 仍控制讲义。使用 scripts/build.py --update-slides 6；发布入口验证交付HTML、源稿摘要、逐维度验收状态和证据文件，学生版移除全部讲者备注。首页与课程目录提供课件入口，不新增讲义、PDF或讲义搜索条目。

教师于2026-10-25随后明确授权第六讲讲义首次发布，包含两处内嵌互动、图解和自查。第六讲现列入 published_lectures 与 standalone_notes_lectures，移出 slides_only_lectures；PDF仍不在发布范围。发布源为 quantum-notes/lecture06.html 单文件阅读版，使用 scripts/build.py --update-notes 6；notes_acceptance 绑定已审阅HTML及源稿摘要，并核对理解、物理、视觉、操作与离线验收。同步首页、课程目录、共享讲义导航和搜索，不改变已发布课件及前五讲正文。

教师于2026-10-26要求第六讲课件最后一页使用前几讲的一键三连动画。当前课件为45张主讲页（含末页动画）、3张垂直补充；仍按既有持续发布授权同步讲义、课件，PDF范围不变。

教师于2026-10-26随后要求在第六讲封面之后增加会议日程：左侧所给二维码，右侧 https://zimin.li/agenda/ 的实时可滚动网页，并明确授权上传PDF。当前为46张主讲页、3张补充页，完整PDF49页；第2页为日程，第3页为本讲导读，末页为一键三连。PDF日程为带链接的静态画面，保留二维码；使用 --update-pdfs 6 更新标准PDF，九宫格仍不发布。

教师于2026-10-31明确要求将第七讲讲义及新做的两项互动上传网页端，随后在线预览。第七讲列入 published_lectures、notes_only_lectures、standalone_notes_lectures；不发布课件或 PDF。使用 --update-notes 7，配套单独页面按 standalone_notes_files 精确复制。notes_preview_acceptance 绑定源稿、交付文件摘要与独立理解/物理/DOM检查证据，明确保留整页视觉和真实浏览器操作待预览状态，不冒称完整验收通过。此前讲次的正式验收要求不变。

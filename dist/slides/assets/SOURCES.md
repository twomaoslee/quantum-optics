## 2026-09-13：直接嵌入媒体

- 黑体光谱、氢原子模型：PhET官方HTML本地副本，保留原标识与许可，CC BY-NC 4.0；详见simulations/README.md。
- 光电效应：OSP官方EJS模拟本地适配，物理方程未改；作者Fu-Kwun Hwang、lookang、tina、Félix J. García Clemente；CC BY-NC-SA 4.0。
- 灯丝、光电效应和原子光谱视频：Weber State University / Amiri，https://physics.weber.edu/amiri/physicsvideos/part2/modern_physics/default.asp 。原生video直接引用官方MP4，未下载视频。替代前版YouTube加载卡。

# 第一讲课件媒体来源

## 2026年9月13日：38页主线与8页备选

- 沿用官方demo的default主题；布局与颜色参考教师《大学物理-3刚体力学.pdf》。参考文件仅用于版式分析，未上传。
- `lecture01-v2/textbook-blackbody.png`：教师提供的四曲线教材截图，像素未修改；具体书名、页码未提供。
- `lecture01-v2/transistor.jpg`：[Unitronic，Wikimedia Commons](https://commons.wikimedia.org/wiki/File:1st-Transistor.jpg)，[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)，原图未修改。
- `lecture01-v2/ruby-laser.jpg`：[HRL Laboratories](https://www.hrl.com/about/laser)，展示红宝石与泵浦闪光灯，保留原图；权利归原提供方。
- `lecture01-v2/hydrogen-emission-spectrum.png`：Umop503 / Wikimedia Commons / CC0，来自讲义现有素材。
- `lecture01-v2/openstax-blackbody-cavity.jpg`：OpenStax《University Physics Vol.3》图6.2，来自讲义现有素材。
- 其余v2图件来自已核验讲义或原课件。外村彰实验各阶段以CSS窗口分栏显示，未修改原始像素；分栏展示按CC BY-SA 3.0共享。
- 视频：BYU Physics Demonstrations，YouTube rnReWgrO14A；WSU Physics Videos，YouTube 7uyIXdO0li4；Weber State University / Amiri光谱实验。黑体辐射与光电效应实验已保存为本地视频随课件携带；原站来源保留。
- 模拟：PhET黑体光谱、氢原子模型；OSP Singapore photoelectriceffectwee3。完整原站入口在相应页面。

## 历史版本记录


## 2026年9月12日完整课件补充

本版40页：35页正文、4页备用、1页来源。新图与原课件素材共同使用。

- `sample-electron/tonomura-apparatus.gif`：Hitachi 官方电子双棱镜装置示意，来源为[单电子干涉实验介绍](https://www.hitachi.com/rd/research/materials/quantum/doubleslit/index.html)。权利归原提供方，原图未改。
- `sample-electron/tonomura-portrait.jpg`：JST ERATO [外村彰项目页](https://www.jst.go.jp/erato/en/research_area/completed/tij_P.html)，权利归原提供方。
- `sample-electron/phasors-general.svg`、`coherent-mixture.svg`：`scripts/make_sample_electron_figures.py` 生成；概率幅示意和八输出理想模型。
- `sample-electron/eight-output-probabilities.svg`：讲义样节的归一化八输出模型计算图。
- `lecture01/blackbody.svg`：Planck 与 Rayleigh–Jeans 谱；同一温度6000 K，以同一个Planck峰值归一化，短波端未截平。公式参考[OpenStax黑体辐射](https://openstax.org/books/university-physics-volume-3/pages/6-1-blackbody-radiation)。
- `lecture01/photoelectric.svg`：单光子理想模型，示例逸出功2 eV；能量守恒与最大动能关系参考[OpenStax光电效应](https://openstax.org/books/university-physics-volume-3/pages/6-2-photoelectric-effect)。
- `lecture01/balmer.svg`：使用氢原子Rydberg模型计算能级和真空波长；各谱线颜色仅作对应标识，未模拟实验强度。
- `lecture01/qubit-levels.svg`、`devices.svg`、`bell-layout.svg`：原子二能级、半导体能带、受激辐射和Bell实验功能的原创示意。没有套用这些示意图声称某套具体装置参数。
- `lecture01/bell-bound.svg`：理想偏振singlet态的相关函数及CHSH比较；直接用两量子比特算符核对。背景参考[2022年诺贝尔奖介绍](https://www.nobelprize.org/prizes/physics/2022/popular-information/)。
- `lecture01/period21.svg`：2的幂模21序列，阶为6。
- `lecture01/fourier-period.svg`：长度64、支持在0模6余数类上的等幅周期态，经逆DFT得到的概率。仅用于展示周期对应的频域结构。
- 上述`lecture01/`图由`scripts/make_lecture01_figures.py`生成。`lecture01/verification.json`记录峰值、能量与波长、Bell相关、求阶与归一化核对。

完整课件未使用旧热辐射定性图、旧原子小太阳系图与旧模15例子。手套页为内联SVG示意。照片保留原像素；单电子图通过CSS选择原面板并添加教学选区。

原始提供文件：教师提供的《从量子力学到量子信息科学.pptx》。图片与视频从该文件直接提取，未修改像素或剪辑视频。文件名中的 s 为原PPT页码。仅本地备课与样式审阅，未据此推定公开转载许可。

## 来自原课件

| 本地文件 | 原PPT页 | 内容及已知署名 | 原始许可 |
|---|---:|---|---|
| `s12-image20.jpeg` | 12 | 薛定谔猫漫画；图中署名“搜狐号@大可数学人生工作室” | 原文件未载明，待核验 |
| `s13-image21.png` | 13 | EPR新闻标题剪影 | 原文件未载明，待核验 |
| `s13-image22.jpeg` | 13 | 2022年诺贝尔物理学奖插画；Niklas Elmehed / Nobel Prize Outreach | 原文件未载明，待核验 |
| `s13-image23.png` | 13 | John Bell肖像 | 原文件未载明，待核验 |
| `s14-image25.png` | 14 | 玻尔研究所建筑（图中标识Niels Bohr Institutet） | 原文件未载明，待核验 |
| `s21-image30.png` | 21 | Feynman肖像 | 原文件未载明，待核验 |
| `s21-image31.png` | 21 | Deutsch肖像 | 原文件未载明，待核验 |
| `s23-image34.png` | 23 | 大整数截图，仅作尺度示意 | 原文件未载明，待核验 |
| `s25-image37.png` | 25 | Peter Shor肖像 | 原文件未载明，待核验 |
| `s3-image3.png` | 3 | 热辐射定性图 | 原文件未载明，待核验 |
| `s3-image4.png` | 3 | 光电效应示意 | 原文件未载明，待核验 |
| `s3-image5.png` | 3 | 旧原子图像示意 | 原文件未载明，待核验 |
| `s4-image6.png` | 4 | 普朗克肖像组合 | 原文件未载明，待核验 |
| `s4-image8.png` | 4 | 玻尔肖像 | 原文件未载明，待核验 |
| `s4-image9.png` | 4 | 爱因斯坦与玻尔合影 | 原文件未载明，待核验 |
| `s5-image10.png` | 5 | 德布罗意肖像 | 原文件未载明，待核验 |
| `s5-image11.png` | 5 | 薛定谔肖像 | 原文件未载明，待核验 |
| `s5-image12.png` | 5 | 海森堡肖像 | 原文件未载明，待核验 |
| `s9-image17.png` | 9 | 波粒二象性动画片头 | 原文件未载明，待核验 |
| `s9-media1.mp4` | 9 | 波粒二象性教学动画（117.17秒，640×360） | 原文件未载明，待核验 |

片头出现“Tout est quantique”及网站 toutestquantique.fr。保留片头和原始视频；它是教学动画，不是外村彰实验的录像。未使用原课件中的爱因斯坦恶搞图、无条件分解耗时截图及未讲解的第二段动画。

## 已有讲义的媒体

- `figures/tonomura-electrons.jpg`：实验为外村彰团队电子双棱镜干涉。Wikimedia Commons用户Belsazar上传，CC BY-SA 3.0。[原始文件页](https://commons.wikimedia.org/wiki/File:Double-slit_experiment_results_Tonomura_2.jpg)，[许可](https://creativecommons.org/licenses/by-sa/3.0/)。HTML用CSS将原图自上而下的五阶段分栏显示，源图片及数据未修改；该分栏展示按同一许可共享。
- `figures/nist-ion-trap.jpg`：摄影Y. Colombe/NIST。[原始图页](https://www.nist.gov/image/quantumcomputingiontrappingjpg)，[NIST使用声明](https://www.nist.gov/copyrights-disclaimers)。保留原图，封面仅使用页面背景遮罩。
- `figures/amplitudes.svg`：现有课程讲义的概率幅示意图，生成脚本位于讲义的scripts/make_figures.py；为理论示意，非实验数据。

## 模板与运行资源

- Quarto官方demo：[在线示例](https://quarto.org/docs/presentations/revealjs/demo/)、[QMD源文件](https://github.com/quarto-dev/quarto-web/blob/main/docs/presentations/revealjs/demo/index.qmd)。保留默认主题。
- 本地MathJax 3.2.2：来自同工作区讲义，保留其LICENSE及完整依赖。
- Revealjs、Source Sans Pro与插件：Quarto 1.9.37构建时自动提供的本地运行资源。

## 本次历史叙事重做

- 原PPT新增复用图片：`from-ppt/slide6-image13.png`、`slide6-image14.jpeg`、`slide6-image15.png`（阅读与影视推荐）；`slide17-image27.png`（比特与Bloch球）；`slide27-image38.png`（平台示意）。图像来自教师原PPT，平台页仅以CSS窗口显示原图中的三个图标，未改动源图片。
- `story/wave-evolution.svg`：自由粒子高斯波包概率密度的两个时刻，无量纲ℏ=m=1。
- `story/born-distribution.svg`：固定随机种子的正态分布位置抽样；为教学模拟，不是实验数据。
- `story/uncertainty.svg`：两种最小不确定高斯态的位置、动量密度，ΔxΔp=1/2（ℏ=1）。
- `story/measurement.svg`：同一等概率双态制备的80次抽样；为教学模拟，不是实验数据。
- `story/energy-levels.svg`：以氢原子n=2、3的能量差示意高、低能级与发光跃迁；省略其他能级。
- `story/phase.html`：理想平衡两路径干涉仪，输出概率为(1±cosφ)/2。此页为直接操作的概率图，不是实验录像。
- 新图由`scripts/make_story_plots.py`生成，保留计算模型和随机种子。
- 玻恩概率解释：https://www.nobelprize.org/uploads/2018/06/born-lecture.pdf 。
- 2022年诺贝尔物理学奖：https://www.nobelprize.org/prizes/physics/2022/summary/ 。
- Deutsch通用量子计算模型：https://www.cs.princeton.edu/courses/archive/fall06/cos576/papers/deutsch85.pdf 。
- Grover搜索原论文发表于1996年：https://arxiv.org/abs/quant-ph/9605043 。
# 2026-09-14 补充素材

- `story/max-born.jpg`：马克斯·玻恩肖像，摄影 Lotte Meitner-Graf；[NobelPrize.org](https://www.nobelprize.org/prizes/physics/1954/born/facts/)，图片地址 https://www.nobelprize.org/images/born-13101-portrait-medium.jpg 。
- 封面沿用 `from-ppt/s12-image20.jpeg`，以CSS渐变融入白底；纠缠页恢复原PPT第13页的三张原图。
- 页面来源注脚转入讲者备注，素材原有署名与来源记录保留。

## 2026-09-14：封面纠缠概念图与人物肖像

- `story/entanglement-kva.png`：©Johan Jarnestad/The Royal Swedish Academy of Sciences。用于2022年诺贝尔物理学奖介绍的概念插画。官方说明允许非商业、编辑或学术用途，须署名；署名同时保存在封面讲者备注。来源：https://www.kva.se/en/news/the-nobel-prize-in-physics-2022/ 。图片：https://www.kva.se/app/uploads/2022/10/figfy22webb2048x1536s8b6t9d2hj-1024x768.png 。此图替代此前的封面猫图。
- `story/einstein.jpg`：Photo from the Nobel Foundation archive。来源：https://www.nobelprize.org/prizes/physics/1921/einstein/facts/ 。图片：https://www.nobelprize.org/images/einstein-12923-portrait-medium.jpg 。用于光量子和三次突破两页，替代与玻尔合影。
- 光电效应视频旁使用原PPT中的 `from-ppt/s3-image4.png`，说明光照金属导致电子逸出；它是原理图，不是验电器装置结构图。

## 2026-09-14：实验贯穿量子概念

- `story/two-path-1.svg`、`two-path-2.svg`、`two-path-3.svg`：自制理想双路径装置示意与相对计数图，由 `scripts/make_concept_figures.py` 生成。虚线路径不是轨迹，曲线不是实验测量数据。
- `story/path-interference.html`：同一理想双路径模型下的相位和路径记录交互。令 g=exp(-x²/4)，相对计数 I=g[1+V cos(2πx+φ)]/2；V=1为相干，V=0为完整可区分路径记录后的电子边缘分布，单路I=g/4。坐标无量纲，不将有限窗口相对计数宣称为归一化概率。
- 教学组织参考：[Feynman Lectures on Physics, III-1, Quantum Behavior](https://www.feynmanlectures.caltech.edu/III_01.html)。图和代码独立绘制，没有复制原讲义图。
- 历史阅读页使用教师原PPT的两幅书封：`from-ppt/slide6-image13.png`、`slide6-image14.jpeg`。电影海报保留在备选页。

## 2026-09-14 封面与历史背景页

- `story/entanglement-cover.png`：内置imagegen新生成的白底蓝灰色艺术概念插画，用于封面。非实验图像；提示词见`story/entanglement-cover-prompt.txt`。原KVA图仍用于共同量子态引入页。
- “历史背景：更多量子力学的故事”：沿用原PPT第6页的`from-ppt/slide6-image13.png`、`slide6-image14.jpeg`及`slide6-image15.png`，依次为两本书封与《奥本海默》电影海报。

## 波粒二象性动画片

- `from-ppt/s10-media2.mp4`：从用户原PPT第10页的`ppt/media/media2.mp4`原样提取，幻灯片对象名为“网球双缝干涉”；封面为同页的`from-ppt/slide10-image18.png`。替代主课件原先误选的第9页视频，原文件仍保留。

## 中南大学校徽与校名组合

- `branding/csu-logo.png`：中南大学官方主站现用横向校徽、中文校名与英文校名组合，原样下载，保持比例。图片：https://www.csu.edu.cn/images/logo3.png 。来源页面：https://www.csu.edu.cn/zjzn/xxbs/xm.htm 。主课件与备选页通过Quarto原生logo配置显示于右下角。

## 原子谱线对比（2026-09-14）

`story/atomic-spectra-comparison.svg` 由 `scripts/build_atomic_spectra.py` 绘制，选取中性氢、氦、汞的代表性空气波长；400—700 nm共同坐标，不编码真实强度、线宽，非完整谱线表。氢精细结构在此尺度合并。连续色带及颜色仅为教学示意。

- https://physics.nist.gov/PhysRefData/Handbook/Tables/hydrogentable2.htm
- https://physics.nist.gov/PhysRefData/Handbook/Tables/heliumtable2.htm
- https://physics.nist.gov/PhysRefData/Handbook/Tables/mercurytable2.htm

原氢光谱实拍 `lecture01-v2/hydrogen-emission-spectrum.png` 保留不改。

## 书封与量子计算系统（2026-09-14）

- `story/quantum-history-zhang.jpg`：张天蓉《群星闪耀：量子物理史话》，清华大学出版社，2021，ISBN 9787302565048。图书页 https://www.tup.com.cn/booksCenter/book_08815401.html ；原封面 https://www.tup.com.cn/upload/bigbookimg/088154-01.jpg 。
- `story/ibm-quantum-system-two-2026.jpg`：IBM Quantum System Two，美国Poughkeepsie系统实拍，摄影版权IBM。采用2026-09-10新闻稿中的官方配图，照片拍摄日期未标明；不是瑞士未来部署的现场照片。新闻稿 https://newsroom.ibm.com/2026-09-10-ibm,-lockheed-martin-announce-swiss-quantum-innovation-hub-at-eth-zurich,-anchored-by-switzerlands-first-ibm-quantum-computer ；源图 https://filecache.mediaroom.com/mr5mr_ibmnewsroom/201870/IBM%20Quantum-System-Two-Poughkeepsie-social.jpg 。
- 新增物质波历史过渡页：Nobel物理奖历史 https://www.nobelprize.org/prizes/themes/the-nobel-prize-in-physics-1901-2000/ ；戴维孙演讲 https://www.nobelprize.org/uploads/2018/06/davisson-lecture.pdf ；Tonomura等，1989，https://doi.org/10.1119/1.16104 。

- `story/born-distribution-wide.svg`：`scripts/build_born_wide.py`生成的教学高斯抽样，随机种子1926，800次抽样；展示前24次记录与全部样本密度直方图，叠加标准正态理论密度。为布局重新绘制，不是实验照片。

- `story/closing-triple.gif`：用户本地提供的“一键三连.gif”原文件，逐字节复制。2026-09-14核验：1920×1080，GIF87a，1帧，无动画时长；目前是静态GIF。

- `story/entanglement-minesweeper-meme.png`：用户于2026-09-14提供的扫雷梗图，原样保留，用于纠缠历史页结束前的课堂幽默；不作为量子纠缠或Bell检验的实验/示意证据。

## 本地授课视频（2026-09-14）
- `story/blackbody-byu.mp4`：BYU Physics Demonstrations，Blackbody radiation，原视频 https://www.youtube.com/watch?v=rnReWgrO14A 。保留完整画面与音轨，H.264/AAC，未剪辑。`story/blackbody-byu-poster.jpg`为视频帧。
- `story/photoelectric-weber.mp4`：Weber State University / Amiri，Photoelectric effect，原文件 https://physics.weber.edu/amiri/physicsvideos/part2/modern_physics/videos/photoelectriceffect.mp4 。完整文件本地副本，未剪辑。
- 本地视频用于这套课堂课件；来源与原作者权利保持不变。

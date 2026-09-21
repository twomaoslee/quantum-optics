# 第二讲素材与计算来源

## 2026-09-20 A/B并排交互比较

- 新增 `comparison-lab.html`，在图2.4之后默认展开。两组共用测量方向滑块：A每次输入正45度偏振；B每次以相同概率随机输入H或V。B先选择输入态，再按该态相对于测量基的概率抽取出口。
- 提供各测1、100、1000次、清空计数、H/V与正负45度预设，以及理论概率揭示。正口理论概率为A的cos²(45°−β)和B的1/2；负口取互补。改变角度同时清空两组旧计数；两组独立抽样，不共享单次结果。
- 圆内短线表示偏振或分析方向，计数点为模拟结果，不是真实数据。保留正文与静态比较图供连续阅读和打印；交互沿用本地资源及自适应嵌入脚本。

核对日期：2026-09-14。历史图像与理论模型分开列示。

## 历史素材

- `stern-gerlach-team.jpg`：法兰克福大学发布的三人照片组合。左至右为Otto Stern、Adolf Schmidt（精密机械师）、Walther Gerlach。原署名：Archive Institut für Kernphysik/Physikalischer Verein。工作年份1922不表示照片拍摄日期。完整原图未裁剪、未重绘。
  - 来源页：https://www.uni-frankfurt.de/en/newsroom/uni-report/ausgabe-1-2026/1922-die-geburt-der-quantenphysik-in-frankfurt
  - 原图：https://assets.uni-frankfurt.de/.imaging/default/dam/newsroom/unireport/issue-1-2026/1922-die-geburt-der-quantenphysik-in-frankfurt-1-2026-archive.jpg/jcr:content
- `sg-record.jpg`：Gerlach于1922年2月8日致Niels Bohr的明信片，显示银原子束无磁场（左）与有磁场（右）的沉积痕迹。转载于Bretislav Friedrich、Dudley Herschbach，Physics Today 56(12),53–59 (2003)，图4，DOI 10.1063/1.1650229。原署名：Courtesy AIP Emilio Segrè Visual Archives。完整下载原图，未裁剪或重绘。
  - 来源页：https://physicstoday.aip.org/features/stern-and-gerlach-how-a-bad-cigar-helped-reorient-atomic-physics
  - 原图：https://k1-prod-aip.s3.us-east-2.amazonaws.com/brightspot/PTO.v56.i12.53_1.f4.jpg

以上历史图像保留原机构／档案署名，用于本课程讲授与批判性说明；不将其标为课程原创或声称已取得开放许可。完整外部文章/PDF未随课件打包。

## 本课程自绘理论图

由 `quantum-notes/scripts/make_lecture02_assets.py` 统一生成，并同步到课件素材目录：

- `polarizers.svg`：两种偏振片排列的教学示意。
- `sg-apparatus.svg`：保留的旧版原理示意；当前讲义与课件已改用下述GPT Image插图。
- `sg-sequences.svg`、`sg-sequence-0.svg` 至 `sg-sequence-2.svg`：理想化连续自旋二分之一分析的理论预测；计数以初始z正制备为分母。
- `transmission.svg`：总透过率cos²θ sin²θ；θ为中间偏振片相对水平的角度，以第一块水平片后的入射为分母。
- `basis-comparison.svg`：正、负45度两种输入在H/V与正/负45度两组基下的理论概率。
- `phase-probability.svg`：等权叠加中改变H、V相对相位φ，正45度概率(1+cosφ)/2、负45度互补，H/V各为1/2。
- `polarizer-lab.html`、`phase-lab.html`、`lab.css`：本课程理论交互模型。柱形和数字为平均概率，不是实验记录。相位模型的制备端需要相位延迟元件。

曲线由Matplotlib生成；灰度下使用文字和实线/虚线区分对象。

## GPT Image教学插图

### 2026-09-20 电场投影与逐次计数

- `projection-counts-gpt.png`：内置GPT Image生成，替换讲义中原 `projection-counts.svg`，原SVG保留。
- 图为教学示意；右侧六次记录为人为指定的H、V、H、H、V、V序列，不是实验数据或随机模拟样本。每列恰有一个实心记录点，多次试验的比例趋近各半不意味着任意六次都恰好各半。
- 核对左侧H/V轴正交、45度电场箭头及两条垂直投影、分量幅度为E₀/√2、强度为入射一半；核对右侧两行六列对齐且每次仅一个出口记录。沿用课程蓝白配色及H/V符号。替换范围为讲义，未修改课件。
- 教师确认：非真实数据的教学示意可使用GPT Image，需核对物理关系并保持全文视觉风格一致。定量曲线和交互模型仍应以相应计算为依据。

### 2026-09-20 对齐修订：当前采用的俯视图

- `qubit-readout-topview-gpt.png`、`malus-power-topview-gpt.png`：内置GPT Image生成的俯视装置示意。分别替换图2.1和图2.2中的旧透视插图；原生成图保留作历史记录，不再被讲义引用。
- 修订原因：旧图的虚线可相连，但元件自身朝向、通光孔与PBS表面的透视未保持一致；此前对旧图的几何验收过于宽松，不能据此称元件已对齐。
- 新版使用俯视布局：输入、制备元件、PBS中心、H端接收孔沿同一水平轴；V端接收孔在穿过PBS中心的垂直轴上，朝向PBS；PBS顶部为正方形，内部镀膜在俯视图中为通过中心的斜线。制备片平面垂直于输入光轴。台面安装孔提供方向参考。
- 检查范围为图示中的平面光路、元件朝向、通光中心和标注关系；俯视图不表达实际安装高度、机械公差或器件内部结构。正文说明实物还需将通光中心调到同一高度。这是教学示意，不是可直接施工的装配图。
- 旧透视图的来源记录如下；其中原先的图像验收结论由本节的撤换说明取代，公式核对继续有效。


- **已停用的透视稿** `malus-power-apparatus-gpt.png`：2026-09-20使用内置GPT Image，以单光子装置插图为外观参考编辑生成经典光束的两路功率测量图。用于讲义“从两路光强到逐次计数”，已标注AI生成。
- 布局为普通光源→45度起偏器→PBS→两只光功率探头→双通道功率计。起偏器为吸收式线偏振片，45度指透光轴相对H方向的角度；入射强度与功率的参考面均在起偏器之后、PBS之前。H直通，V在台面内反射90度；探头接收整个输出光束，理想归一化功率与强度之比一致。仪表无数值读数，不作为实验测量数据。
- 理论参考：OpenStax, University Physics Volume 3, §1.7 Polarization，https://openstax.org/books/university-physics-volume-3/pages/1-7-polarization 。器件光路参考：Thorlabs Polarizing Beamsplitter Cubes，https://www.thorlabs.com/catalogpages/V21/855.pdf 。原图与本图都保留，互不覆盖。

- **已停用的透视稿** `qubit-readout-apparatus-gpt.png`：2026-09-20使用内置GPT Image生成并经一次几何校正的实验装置示意，替换讲义图2.1。保留原功能框图 `qubit-readout.svg`。
- 该图是课程教学模型，不是真实实验照片。展示已提供的单光子输入、旋转架中的偏振制备元件、偏振分束器和两个自由空间探测器；不展开光子源制备。输入取已知线偏振时可用旋转半波片选择H、V及正45度制备，波片原理在后文展开。
- 物理检查：制备元件的光轴与输入共线；PBS直通H、反射V，两输出在台面平面内互相垂直；探测器入光口朝向各自光路，H口记录0、V口记录1；虚线为光路标注，没有将单光子画成两个半光子或伪造计数数据。首稿制备元件朝向错误，已通过GPT Image编辑校正，首稿不用于讲义。
- 装置对应关系参照伯克利大学本科实验文档 https://experimentationlab.berkeley.edu/node/44 ，其“Downconverted Photon Beam Path”说明波片、PBS、两个收集通道与APD的连接。该真实实验是双光子Bell实验，收集光经光纤送往探测器；生成图为单臂教学布局，采用直接接收的探测器外形，未复制或冒充该校实物照片。

- `sg-apparatus-gpt.png`：2026-09-14使用内置GPT Image工具生成。替换讲义图2.3与课件装置页，原SVG保留。
- 教学原理示意，不按比例；不是历史装置照片、磁场数值解或实验沉积记录。忽略远处边缘场，以场内偏转、场外近似直线表示两束原子的传播。
- 检查：原子束由炉经两处准直开口进入磁极间隙；N极在上、S极在下，细场线箭头向下；两条轨迹在场区逐渐分离，离场后直线延伸至A/B斑点；没有第三条中央输出；不把上下位置直接标为自旋正负。
- 示意图中的场线疏密和沉积斑宽度不承载定量结果；其他概率曲线仍由原数值脚本生成。

## 物理参考

- https://www.feynmanlectures.caltech.edu/III_05.html ：理想连续分析与历史装置的区别。该章主体为自旋一，本讲不用其三输出图。
- https://www.feynmanlectures.caltech.edu/III_06.html ：自旋二分之一、基与分析器。
- https://www.feynmanlectures.caltech.edu/III_11.html ：光子偏振的二维描述。

## 课程既有素材

课件封面复用第一讲已采用的蓝灰色艺术背景 `assets/story/entanglement-cover.png`，不标作实验图；校徽复用 `assets/branding/csu-logo.png`。均保留原项目来源记录。


## 2026-09-14 讲义交互与视频补充

本次只更新讲义。四个交互页面直接维护HTML源码，不由静态图生成脚本生成：

- `polarizer-lab.html`：插片、移片、转角；逐步更新透过态、条件概率与期望计数。分母从第一块H片之后开始。没有入射或透过样本时不伪称有实际输出态。
- `spin-lab.html`：z+→z、z+→x、z+→x选正支→z；预测后揭示，两类统计分母并列。
- `basis-lab.html`：线偏振实系数平面，参考基被动旋转与制备主动改变并列；固定实验室H分析器。
- `phase-lab.html`：正负45度通道的复概率幅相加；随机H/V混合切换后撤去共同相位及相干相加图。
- `interactive.css`、`embed.js`、`notes-media.js`：本地样式、自适应嵌入高度、视频互斥与收起暂停。

视频来源：Shaoul Ezekiel，MIT OpenCourseWare，Video Demonstrations in Lasers and Optics；课程页面标Spring 2008，不把这一课程归档年份写成拍摄年份。

1. `polarizers-demo.mp4` / `.jpg`：Polarization Rotation Using Polarizers，源视频06:28–07:16，48秒。
   - 官方页面：https://ocw.mit.edu/courses/res-6-006-video-demonstrations-in-lasers-and-optics-spring-2008/resources/polarization-rotation-using-polarizers/
   - 官方页面的下载链接：https://archive.org/download/MITlaser_demo/demo-2_300k.mp4
2. `waveplate-demo.mp4` / `.jpg`：Quarter-wave Plate，源视频04:52–06:13，81秒。
   - 官方页面：https://ocw.mit.edu/courses/res-6-006-video-demonstrations-in-lasers-and-optics-spring-2008/resources/quarter-wave-plate/
   - 官方页面的下载链接：https://archive.org/download/MITlaser_demo/demo-3_300k.mp4

两个片段及从片段抽取的预览帧沿用MIT OCW页面所示CC BY-NC-SA 4.0：https://creativecommons.org/licenses/by-nc-sa/4.0/ 。修改：裁取上述片段、重编码，在原画面上方增加黑底中文观察提示；保留原声、未裁掉装置画面。中文观察提示不是逐字翻译，其源码是对应`*-guide.ass`；此视频改编及提示同样以CC BY-NC-SA 4.0提供。

Bloch球选读链接：https://phet.colorado.edu/en/simulations/quantum-measurement 。官方内容说明：https://www.colorado.edu/research/qsense/simulations 。只提供原站链接，未复制或改编PhET软件。

## 2026-09-19 以量子比特为主线的讲义重写

本次更新讲义与讲义目录，未同步修改课堂课件。

新增八幅课程原创SVG，由 `scripts/make_lecture02_qubit_figures.py` 生成：

- `qubit-readout.svg`：单光子偏振编码、分束与出口记录，功能示意。
- `projection-counts.svg`：经典电场投影与逐次单光子事件并列；事件为示意，不是实验数据。
- `preparation-comparison.svg`：固定正45度纯态与随机H/V制备在两组测量下的理论概率。
- `polarization-coordinates.svg`：线偏振方向与选定H/V基底中的态坐标。
- `amplitude-addition.svg`：内积的两项贡献先相加再平方；连线不是两条实际空间光路。
- `conditional-update.svg`：保留结果分支、更新条件态，再进行下一步分析。
- `phase-device.svg`：固定H/V主轴的可调延迟元件，展示相对光程差的物理来源。
- `encoding-levels.svg`：多能级中的编码子空间、等间隔谐振谱、非等间隔transmon示意。各图能量尺度独立，不代表具体器件或选择定则。

新增 `preparation-lab.html`：固定正45度与随机H/V制备，分析方向可调，逐次事件与累计统计，理论概率可揭示。随机H/V模型先抽样制备再按条件概率抽样结果。切换制备或分析角度清空计数，避免混合不同设置的统计。

修订 `phase-lab.html`：滑块明确对应固定主轴、等权输入下的相对光程差；随机混合没有共用的确定相位。原有四个模型和两个MIT片段在新叙事中复用。

新增物理背景参考：

- Feynman Lectures III, Chapter 6：https://www.feynmanlectures.caltech.edu/III_06.html 。自旋二分之一的矩阵及结果态。正文明确模型矩阵是物理输入，并展示本征态的求解。
- NIST, An experimental primer on the trapped-ion quantum computer：https://www.nist.gov/publications/experimental-primer-trapped-ion-quantum-computer 。内部态编码。
- Krantz et al., A quantum engineer’s guide to superconducting qubits：https://arxiv.org/html/1904.06560v3#S2.SS1 。非谐性与电路量子比特能级。


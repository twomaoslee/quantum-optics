# 第二讲使用中的素材与来源

本版依据2026年9月20日定稿讲义重建课堂课件。下列图件与讲义使用相同版本及物理约定。

## 图件和课堂模型

- GPT Image教学示意：`qubit-readout-topview-gpt.png`、`projection-counts-gpt.png`、`pbs-measurement-45-comparison-gpt-v2.png`、`polarizers-comparison-gpt.png`、`conditional-update-gpt.png`、`relative-phase-waveforms-gpt.png`、`sg-apparatus-gpt.png`。用于装置、偏振方向、保留分支及相位关系的课堂说明；计数示例为示意。
- `transmission.svg`：理论曲线，统计从第一块水平偏振片之后开始，总概率为cos²θ sin²θ。曲线与坐标由Matplotlib生成。
- `transmon-from-lc.svg`：课程原创电路与能级图。电感和电容构成LC振子；约瑟夫森结与大电容构成transmon。图中对比等间距与弱非等间距，蓝色标出最低两个编码态。使用数值本征能级构造示意，公式为矢量字形。
- `phase-lab.html/css/js`、`spin-lab.html/css/js`：课程原创16:9交互，沿用定稿讲义版本。本地KaTeX负责公式。相位交互比较相干叠加与随机H/V混合；自旋交互区分条件概率与相对于初始样本的比例。显示理论概率与期望数。
- 课件内偏振方向、电场投影小图由 `lecture02_layout.py` 生成；不承载实验数据。
- 校徽沿用课程现有中南大学标识；封面背景沿用第一讲已采用的 `assets/story/entanglement-cover.png` 艺术图。

## 实验视频

视频来源：Shaoul Ezekiel，MIT OpenCourseWare，Video Demonstrations in Lasers and Optics；课程页面标Spring 2008，不把这一课程归档年份写成拍摄年份。

1. `polarizers-demo.mp4` / `.jpg`：Polarization Rotation Using Polarizers，源视频06:28–07:16，48秒。
   - 官方页面：https://ocw.mit.edu/courses/res-6-006-video-demonstrations-in-lasers-and-optics-spring-2008/resources/polarization-rotation-using-polarizers/
   - 官方页面的下载链接：https://archive.org/download/MITlaser_demo/demo-2_300k.mp4
2. `waveplate-demo.mp4` / `.jpg`：Quarter-wave Plate，源视频04:52–06:13，81秒。
   - 官方页面：https://ocw.mit.edu/courses/res-6-006-video-demonstrations-in-lasers-and-optics-spring-2008/resources/quarter-wave-plate/
   - 官方页面的下载链接：https://archive.org/download/MITlaser_demo/demo-3_300k.mp4

两个片段及从片段抽取的预览帧沿用MIT OCW页面所示CC BY-NC-SA 4.0：https://creativecommons.org/licenses/by-nc-sa/4.0/ 。修改：裁取上述片段、重编码，在原画面上方增加黑底中文观察提示；保留原声、未裁掉装置画面。中文观察提示不是逐字翻译，其源码是对应`*-guide.ass`；此视频改编及提示同样以CC BY-NC-SA 4.0提供。

## 历史记录

`sg-record.jpg`：格拉赫1922年致玻尔明信片中的银原子沉积记录，无场在左、有场在右。转载自Bretislav Friedrich与Dudley Herschbach，Physics Today 56(12),53–59 (2003)，图4，DOI 10.1063/1.1650229。原署名AIP Emilio Segrè Visual Archives。

[来源文章](https://physicstoday.aip.org/features/stern-and-gerlach-how-a-bad-cigar-helped-reorient-atomic-physics)。保留档案署名，用于教学说明；未随包复制来源文章。

## 理论与背景

- [费曼物理学讲义III，第11章](https://www.feynmanlectures.caltech.edu/III_11.html)：偏振与两态概率幅。
- [费曼物理学讲义III，第6章](https://www.feynmanlectures.caltech.edu/III_06.html)：自旋二分之一、矩阵与结果态。
- [NIST，An experimental primer on the trapped-ion quantum computer](https://www.nist.gov/publications/experimental-primer-trapped-ion-quantum-computer)：离子内部态编码。
- [Koch等，Charge-insensitive qubit design derived from the Cooper pair box](https://arxiv.org/abs/cond-mat/0703002)：transmon、电容分流与弱非简谐性。
- [Krantz等，A quantum engineer’s guide to superconducting qubits](https://arxiv.org/abs/1904.06560)：超导电路的能级与控制。
- [2025年诺贝尔物理学奖官方公告](https://www.nobelprize.org/prizes/physics/2025/press-release/)：John Clarke、Michel H. Devoret、John M. Martinis，电路中的宏观量子隧穿与能量量子化。

## 软件

主课件由Quarto/Reveal.js构建，公式使用MathJax 3 SVG输出。交互随包提供KaTeX及字体，保留其MIT许可证。分发包包含课件和使用中的媒体，不包含独立来源论文。

## 一键三连结束动画

直接使用教师提供的 `assets/story/closing-triple.gif` 原始像素。SVG视口分别显示原图中的点赞、投币、收藏和鼠标，CSS控制蓄力、变色和轻弹；每4秒循环。原GIF原样保留，结束页中嵌入其完整数据，可离线播放。

## 开场问题

- Peter W. Shor, [Polynomial-Time Algorithms for Prime Factorization and Discrete Logarithms on a Quantum Computer](https://arxiv.org/abs/quant-ph/9508027)：与定稿讲义一致，用于引出量子计算的信息载体、操作和读出问题；本讲不展开算法步骤。

- 诺奖人物页肖像：John Clarke、Michel H. Devoret、John M. Martinis，按诺奖官网2025物理学奖汇总页的人物标识对应。© Nobel Prize Outreach；Photo: Clément Morin。官网原图未裁剪，供本课程人物介绍使用。
  - 汇总与获奖发现：https://www.nobelprize.org/prizes/physics/2025/summary/
  - Clarke：https://www.nobelprize.org/images/188476-portrait-medium.jpg
  - Devoret：https://www.nobelprize.org/images/186711-portrait-medium.jpg
  - Martinis：https://www.nobelprize.org/images/186053-portrait-medium.jpg
  - 获奖实验年代（1984—1985）：https://www.nobelprize.org/uploads/2025/10/popular-physicsprize2025-3.pdf

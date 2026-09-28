# 第三讲图件记录

## 2026-09-25：计算图统一为可调参数图

- 教师确认：网页直接展示计算图，打印同一图的默认参数；不额外维护静态替代图。
- 图3.5改为transmon-lab.html，默认transmon、60 fF；图3.7改为rabi-pulse-lab.html，默认100 ns，固定Ω/(2π)=5 MHz。保留原图号，取消“PNG＋折叠交互”的重复结构。
- figure-print.js在打印前暂存读者状态、调用原绘图函数恢复默认参数；打印结束后恢复读者参数。图内SVG/KaTeX直接参与打印，不导出或加载替代PNG。
- 下列历史静态PNG和生成页面保留原文件，但transmon-level-comparison.png、rabi-pulse-comparison.png及rabi-pulse-lab.png不再用于讲义正文或打印。相位解释图与装置示意图不属于本次重复计算图，保留。

## 第五节图件：相位快慢项与Rabi脉冲

- 日期：2026-09-25；按教师批准的两张静态图与一个交互版方案，程序绘制，未用生图模型生成坐标、公式或状态。
- 静态图：rwa-phase-comparison.png、rabi-pulse-comparison.png，均为2560×1440像素（16:9）；对应同名HTML为可再生成的源页面。
- 交互：rabi-pulse-lab.html；rabi-pulse-lab.png为50 ns关断时的预览。
- 共享实现：rabi-figures.js、rabi-figures.css；使用现有本地KaTeX，不依赖服务器或网络。
- 相位图取共振时第二概率幅方程中的差频因子exp[i(omega0-omegad)t]与和频因子exp[i(omega0+omegad)t]，在一个快项周期内取8个等间隔相位。展示等权向量和，并非完整量子跃迁幅度；快项实际影响并非严格为零。上下首尾相接箭头采用相同长度。
- Rabi图采用前述大纲约定：g(t)=hbar*Omega*cos(omegad*t)，初相位0，精确共振、旋波近似，初态|0>，Omega/(2pi)=5 MHz。该数字是教学模型设定，非某设备实验数据。
- 在扣除自由演化相位的表示中，a=cos(Omega*t/2)，b=-i*sin(Omega*t/2)，P1=|b|²；50/100/200 ns对应pi/2、pi、2pi脉冲。静态图省略整体相位；交互保留概率幅的符号与复相位。
- 关断后理想模型的能量基底占据概率保持不变；原始状态的相对相位仍会自由演化，故不将占据概率冻结解释为所有状态信息冻结。
- 波形仅画包络，不画载波，避免把载波频率与Rabi频率混淆。静态曲线为持续驱动的参照，各末态取自独立脉冲；交互蓝实线为实际关断曲线，灰虚线为继续驱动的参照。
- 物理参考：MIT OpenCourseWare，5.61 Fall 2017 Lecture 36，第4–5页区分频率和项与频率差项并给出旋转波近似。正文按第四节的概率幅方程独立推导，采用g(t)=ℏΩ cos(ω_d t)约定。https://www.ocw.mit.edu/courses/5-61-physical-chemistry-fall-2017/23f23a23487b97c09aaf468f478987c9_MIT5_61F17_lec36.pdf

## lc-to-transmon-structure-gpt-v2.png

- 生成日期：2026-09-24；工具：内置 GPT Image，基于旧图重新设计布局。
- 按教师批注，将原先右下角放大框改为横向第三组；LC电路、transmon电路、结的材料结构沿同一水平带排列，标题与下方说明分别对齐。
- 类型与物理约定不变：16:9教学示意，非按比例；前两组均为并联电路，第三组为超导体—极薄绝缘层—超导体结构。
- 讲义图注、替代文字同步更新方位描述。旧版记录如下，仅留作历史。

## lc-to-transmon-structure-gpt.png

- 生成日期：2026-09-24；工具：内置 GPT Image。
- 类型：16:9电路结构与Josephson结材料层教学示意，不是器件照片或定量能级图。
- 约定：两栏均为电容与另一个元件并联；电容极板间有间隙，结符号对应超导体—绝缘层—超导体结构。电容视为简化模型总电容，控制和读出线路省略。

## transmon-level-comparison.png 与 transmon-lab

- 日期：2026-09-24；自编数值计算和浏览器图形，不由生图模型给出能级位置。
- 静态图由 transmon-comparison.html 使用 transmon-spectrum-data.js 渲染，再以浏览器截图导出；交互使用同一数据文件。
- 固定 Ej/h = 20 GHz，偏置电荷 ng=0，总电容40—120 fF，步长1 fF。充电能 Ec=e²/(2C)。数值对角化电荷基底 n=-20…20 下的 H/h；对角为4Ec(n-ng)²/h，邻接元为-Ej/(2h)。
- LC参照电感 L=(hbar/2e)²/Ej = 8.17307564033906 nH，固定不变，电容与transmon相同。静态比较取60 fF；能量零点分别取各自最低能级，两栏采用相同纵轴尺度。
- 模型与设计依据：[Koch等，PRA 76, 042319 (2007)](https://arxiv.org/html/cond-mat/0703002v2)，式(1)、(11)、(12)。数值模型以完整余弦而非四阶近似计算。
- 电路与控制背景：[Krantz等，A Quantum Engineer's Guide to Superconducting Qubits](https://arxiv.org/abs/1904.06560)。

## phase-retarder-two-inputs-gpt.png

- 生成日期：2026-09-23。
- 来源：内置 GPT Image 生图工具；教师预览确认后收入讲义。
- 类型：偏振横截面与功能教学示意，非实验数据或真实装置照片。
- 内容：主轴沿 H、V、V 相对 H 延迟 π 的同一理想元件；加态变为减态，水平态保持水平。省略整体相位。
- 用途：第一节 1.2 的两输入对照；图内概率幅和偏振方向已与正文核对。

## atomic-level-encoding-gpt.png

- 生成日期：2026-09-23。
- 工具：内置 GPT Image。
- 类型与约定：原子多能级与选定编码子空间的16:9教学示意，非具体原子的实测谱图。两个蓝色编码态的能量位置在左右两栏保持一致。
- 图件为原创生成的教学示意；物理依据不作为图片来源混同。

## ion-trap-internal-states-gpt.png

- 生成日期：2026-09-23。
- 工具：内置 GPT Image。
- 类型与约定：单个正离子的空间束缚、控制光与内部两态的16:9功能示意。最终采用电极横截面；轴向电极省略。控制和荧光读出分步进行。原始透视版本未用于讲义。
- 图件为原创生成的教学示意；物理依据不作为图片来源混同。

## 2026-09-25 图件文字精简

本轮使用内置 GPT Image，以原图为输入做局部文字编辑。保留旧文件，讲义改用以下版本；物理结构、编码与蓝白构图保持不变。

- `atomic-level-encoding-gpt-v2.png`：将“其他内部态仍然存在”改为“其他内部态”，去掉底部“纵轴表示能量，非空间高度”的重复说明。
- `ion-trap-internal-states-gpt-v2.png`：保留“改变内部态”，去掉“不表示离子上下移动”；将横截面旁注缩为“电极横截面示意”，去掉底部比例与操作顺序旁注。
- `lc-to-transmon-structure-gpt-v3.png`：去掉底部未绘线路说明与“非按比例”旁注，保留结的材料结构标签。


代码绘图：`rwa-phase-comparison.html` 与 `rabi-pulse-lab.html` 精简图内解释；相位图从同一HTML重新渲染。计算公式和交互逻辑未改。

## 2026-09-25 删字后的版式重排


相位与Rabi图在原生HTML/CSS/JS中调整坐标与版面，未改变演化模型；原子编码态、离子数和光路、电路并联拓扑均保留。

## 第二节物理依据

- NIST，Laser Cooling of Atoms，图1说明：线性离子阱用交变与静态电场束缚离子。https://nvlpubs.nist.gov/nistpubs/sp958-lide/html/200-202.html
- Myerson 等，High-fidelity readout of trapped-ion qubits，Phys. Rev. Lett. 100, 200502 (2008)：辅助循环跃迁与亮暗荧光读出。https://arxiv.org/abs/0802.1684
- Schmidt-Kaler 等，Ground state cooling, quantum state engineering and study of decoherence of ions in Paul traps (2000)：基态与长寿命激发态编码及激光直接控制。https://arxiv.org/abs/quant-ph/0003096

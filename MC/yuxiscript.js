document.addEventListener('DOMContentLoaded', () => {
    // 全局状态管理（简化：只关注扣分，不再按分项存分数）
    const state = {
        totalDeduction: 0,    // 总扣分数（核心：所有扣分累加）
        details: [],          // 扣分详情
        prepared: false,      // 是否完成清点（仅正确清点后为true）
        step: 0,              // 实验步骤：0-准备 1-放木板 2-放叶片 3-放双面刀片 4-切割中 5-清水 6-毛笔 7-显微镜
        bladeCount: 0,        // 双面刀片数量（需1个）
        isDipped: false,      // 双面刀片是否已蘸水（每次切割前需重新蘸水）
        focusLevel: 0,        // 显微镜调焦等级（0模糊→5清晰）
        hasFocusDeducted: false,// 标记调焦过度是否已扣分（避免重复扣）
        cutCount: 0,
        hasDish: false,
        canDragToolsAfterDip: false,
        lastAction: "",
        hasCut :false,
        microStep: 0, // 显微镜操作步骤：0-初始 1-粗准焦上升 2-转换器完成 3-反光镜完成 4-载玻片完成 5-粗准焦下降 6-细准焦完成
        coarseFocusClickCount: 0, // 粗准焦螺旋点击次数（0-未点击 1-第一次 2-第二次）
        isCoarseBtnDisabled: false, // 粗准焦按钮是否禁用
        isFineBtnDisabled: true, // 细准焦按钮是否禁用
        isRevolverBtnDisabled: false, // 转换器按钮是否禁用
        isMirrorBtnDisabled: false, // 反光镜按钮是否禁用
        isSlidePlaceBtnDisabled: false, // 载玻片放置按钮是否禁用
        isAnswering: false, // 是否正在答题（禁用实验操作）
        currentQuestions: [], // 当前随机抽取的题目
        answeredCount: 0, // 已答对的题目数
        pendingOperation: null, // 待执行的操作（答题后执行）
    };
    // 实验题库（按数字分类，可扩展）
    // 新增：type: 'image' 表示图片题，src放图片路径，answer是标准答案
    const questionBank = {
        1: [ // 分类1：刀片蘸水相关
            {
                id: 101,
                title: "制作叶片切片时，切割前刀片必须蘸水的目的是？",
                options: [
                    "A. 防止刀片生锈",
                    "B. 使切下的薄片粘在刀片上，避免散落",
                    "C. 润滑刀片，切割更省力",
                    "D. 清洁刀片"
                ],
                answer: "B"
            },
            {
                id: 102,
                type: 'image', // 图片题标识
                src: "https://via.placeholder.com/600x400?text=刀片蘸水示意图", // 图片地址
                title: "观察图片，写出刀片蘸水后立即切割的主要原因（填写文字）",
                answer: "保证切片湿润不卷曲" // 标准答案
            }
        ],
        2: [ // 分类2：显微镜粗准焦相关
            {
                id: 201,
                title: "使用粗准焦螺旋下降镜筒时，眼睛应注视？",
                options: [
                    "A. 目镜",
                    "B. 物镜",
                    "C. 载物台",
                    "D. 反光镜"
                ],
                answer: "B"
            },
            {
                id: 202,
                type: 'image',
                src: "https://via.placeholder.com/600x400?text=显微镜粗准焦操作图",
                title: "观察图片，写出下降镜筒时眼睛注视的部件名称",
                answer: "物镜"
            }
        ],
        3: [ // 分类3：切片厚度相关
            {
                id: 301,
                title: "叶片横切面临时切片制作中，最薄的切片才能观察清晰，原因是？",
                options: [
                    "A. 便于光线透过",
                    "B. 节省材料",
                    "C. 操作更简单",
                    "D. 避免划伤物镜"
                ],
                answer: "A"
            }
        ],
        4: [ // 分类4：使用工具
            {
                id: 401,
                title: "显微镜调焦时，先使用粗准焦螺旋再用细准焦螺旋的原因是？",
                options: [
                    "A. 粗准焦调节范围大，快速找到物像",
                    "B. 细准焦容易损坏",
                    "C. 粗准焦更精准",
                    "D. 操作习惯"
                ],
                answer: "A"
            }
        ],
        5: [ // 分类5：提交材料
            {
                id: 501,
                title: "培养皿中加入清水的作用不包括？",
                options: [
                    "A. 保持切片湿润",
                    "B. 便于毛笔选取切片",
                    "C. 清洗刀片",
                    "D. 防止切片卷曲"
                ],
                answer: "C"
            }
        ],
        6: [ // 分类6：可自定义其他类别
            // 自定义题目...
        ]
    };
    const RANDOM_QUESTION_COUNT = 1;
    const toolPositions = {
        '纱布': { x: 400, y: 200 },
        '盖玻片': { x: 320, y: 200 },
        '载玻片': { x: 200, y: 200 }
    };
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    const logPanel = document.getElementById('logPanel');
    const stage = document.getElementById('mainStage');
    const guide = document.getElementById('topGuide');
    const shelf = document.getElementById('shelf');
    const restartBtn = document.getElementById('restartBtn');
    const closeReportBtn = document.getElementById('closeReportBtn');
    const btnDipWater = document.getElementById('btnDipWater');
    const btnCut = document.getElementById('btnCut');
    const leafItem = document.getElementById('leaf-on-wood');
    const blade1 = document.querySelector('.blade.b1');
    const blade2 = document.querySelector('.blade.b2');
    const cutButtons = document.getElementById('cut-buttons');
    const requiredEquips = ['小木板', '新鲜菠菜叶片', '双面刀片', '清水', '毛笔', '显微镜', '载玻片','镊子','纱布','盖玻片','培养皿（内含清水）'];
    const distractEquips = ['酒精灯', '试管', '火柴','单面刀片'];
    const allEquipsForCheck = [...requiredEquips, ...distractEquips];

    function initShelf() {
        shelf.innerHTML = '';
        const shuffledRequired = shuffleArray(requiredEquips);
        shuffledRequired.forEach(name => {
            const item = document.createElement('div');
            item.className = 'instrument';
            item.draggable = true;
            item.innerText = name;
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text', name);
                item.style.opacity = '0.7';
            });
            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
            });
            shelf.appendChild(item);
        });
    }

    // 核心：所有操作前先弹题，答对执行pendingOperation
    stage.addEventListener('dragover', (e) => e.preventDefault());
    stage.addEventListener('drop', (e) => {
        if(state.isAnswering) return;
        const name = e.dataTransfer.getData('text');
        // 拖拽前弹题
        state.pendingOperation = () => handleExperimentLogic(name);
        
        showQuizModal(1);
        
        
    });

    function showTool(name) {
        console.log("【调试】开始处理工具显示：", name);
        switch (name) {
            case '镊子':
                document.getElementById('dip-water-dish').classList.remove('hidden');
                document.getElementById('tool-forceps').classList.remove('hidden');
                break;
            case '载玻片':
                document.getElementById('dip-water-dish').classList.remove('hidden');
                document.getElementById('tool-slide').classList.remove('hidden');
                break;
            case '盖玻片':
                document.getElementById('dip-water-dish').classList.remove('hidden');
                document.getElementById('tool-coverslide').classList.remove('hidden');
                break;
            case '纱布':
                document.getElementById('dip-water-dish').classList.remove('hidden');
                document.getElementById('tool-gauze').classList.remove('hidden');
                break;
            case '毛笔':
                document.getElementById('dip-water-dish').classList.remove('hidden');
                document.getElementById('brush-tool').classList.remove('hidden');
                break;
            case '清水':
                document.getElementById('dip-water-dish').classList.remove('hidden');
                document.getElementById('tool-water').classList.remove('hidden');
                break;
            default:
                console.warn("【警告】未知工具：", name);
                break;
        }
        document.getElementById('dip-water-dish').classList.remove('hidden');
    }

    function handleExperimentLogic(name) {
        if (!state.prepared) {
            return addLog("❌ 请先完成「清点器材」步骤（需选对所有必需器材）！");
        }
        const tools = ['载玻片','镊子','纱布','盖玻片','毛笔','清水'];
        if (name === '培养皿（内含清水）') {
            const dipDish = document.getElementById('dip-water-dish');
            dipDish.classList.remove('hidden');
            state.hasDish = true;
            addLog("✅ 已放置培养皿（内含清水），可进行切割操作");
            return;
        }
        if (tools.includes(name)) {
            if (state.lastAction !== "dip") {
                state.totalDeduction += 0.5;
                state.details.push(`未蘸水就放置${name}`);
                addLog(`❌ 请先完成前面操作，再放置${name}！`);
                return;
            }
            document.getElementById('cutting-zone').classList.add('hidden');
            document.getElementById('temp-slide-zone').classList.add('hidden');
            document.getElementById('micro-view').classList.add('hidden');
            const dipDish = document.getElementById('dip-water-dish');
            dipDish.classList.remove('hidden');
            showTool(name);
            addLog(`✅ 已放置：${name}`);
            return;
        }
        if (name === '小木板' && state.step === 0) {
       
            document.getElementById('cutting-zone').classList.remove('hidden');
            document.getElementById('s-cut-step').innerText = "已放木板 → 请放叶片";
            state.step = 1;
            guide.innerText = "请将「新鲜菠菜叶片」平放在木板上";
            addLog("✅ 放置小木板");
        } 
        else if (name === '新鲜菠菜叶片' && state.step === 1) {
            leafItem.classList.remove('hidden');
            document.getElementById('s-cut-step').innerText = "已放叶片 → 请放双面刀片";
            state.step = 2;
            guide.innerText = "如果没有选择培养皿（含清水），选择完成后再拖入-双面刀片";
            addLog("✅ 放置菠菜叶片");
        }
        else if (name === '双面刀片' && state.step === 2) {
            state.bladeCount++;
            if (state.bladeCount === 1) {
                blade1.classList.remove('hidden');
                cutButtons.classList.remove('hidden'); 
                document.getElementById('s-cut-step').innerText = "双面刀片 → 切割前必须先蘸水！";
                state.step = 3;
                guide.innerText = "切割前必须先点击「蘸水」按钮，再点击切割！";
                addLog("✅ 放置双面刀片，切割前请先点击「蘸水」按钮");
            }
        }
        else if (name === '清水' && state.step === 3 && state.hasCut) {
            blade1.classList.add('hidden');
            if (blade2) blade2.classList.add('hidden');
            cutButtons.classList.add('hidden');
            const dishZone = document.getElementById('dish-zone');
            dishZone.classList.remove('hidden');
            state.step = 4;
            document.getElementById('s-cut-step').innerText = "已放清水 → 请放毛笔选取切片";
            guide.innerText = "请拖入「毛笔」选取培养皿中最薄的切片";
            addLog("✅ 放置清水（双面刀片已蘸水，切割完成）");
        }
        else if (name === '毛笔' && state.step === 4) {
            playBrushAnimation();
            document.getElementById('cutting-zone').classList.add('hidden');
            document.getElementById('dish-zone').classList.add('hidden');
            document.getElementById('temp-slide-zone').classList.add('hidden');
            state.step = 5;
            document.getElementById('s-cut-step').innerText = "已蘸取切片 → 请放载玻片制作临时切片";
            guide.innerText = "请拖入「载玻片」制作临时切片（放置后毛笔会隐藏）";
            addLog("✅ 用毛笔选取最薄切片，等待放置载玻片");
        }
        else if (name === '载玻片' && state.step === 5) {
            document.getElementById('temp-slide-zone').classList.remove('hidden');
            state.step = 6;
            document.getElementById('s-cut-step').innerText = "已制作临时切片 → 请放显微镜";
            guide.innerText = "请拖入「显微镜」开始观察叶片组织";
            addLog("✅ 放置载玻片，完成临时切片制作");
        }
        else if (name === '显微镜' && (state.step === 6 || state.step === 7)) {
            document.getElementById('dip-water-dish').classList.add('hidden')
            document.getElementById('temp-slide-zone').classList.add('hidden');
            document.getElementById('micro-view').classList.remove('hidden');
            document.getElementById('eyepiece-circle').classList.remove('hidden');
            initMicroscope();
            state.step = 7;
            document.getElementById('s-cut-step').innerText = "显微镜已放置 → 按步骤操作：粗准焦上升→转换器→反光镜→载玻片→粗准焦下降→细准焦";
            guide.innerText = "请按显微镜左侧按钮顺序操作（从上到下），完成调焦观察";
            addLog("✅ 放置显微镜并完成对光，开始按步骤操作显微镜按钮");
        }
        else if(!tools.includes(name) && name !== '培养皿（内含清水）' && name !== '小木板' && name !== '新鲜菠菜叶片' && name !== '双面刀片' && name !== '显微镜') {
            addLog(`⚠️ 当前步骤无法放置「${name}」，请按指引操作`);
        }
    }

    function clearAllTools() {
        const toolsToClear = [
            'tool-slide', 'tool-coverslide', 'dip-water-dish',
            'tool-gauze', 'tool-water', 'brush-tool', 'tool-forceps'
        ];
        toolsToClear.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        addLog("🧹 已清空载玻片、盖玻片、培养皿等工具，准备放置显微镜");
    }

    // 按钮点击前弹题
    btnDipWater.onclick = () => {
        if(state.isAnswering) return;
        state.pendingOperation = () => {
            if (state.step !== 3) {
                state.totalDeduction += 0.5;
                state.details.push("制作切片：未放置双面刀片就点击蘸水 (-0.5)");
                addLog("❌ 请先放置双面刀片！→ 扣0.5分");
                return;
            }
            const dipDish = document.getElementById('dip-water-dish');
            dipDish.classList.remove('hidden');
            const blade = document.querySelector('.blade.b1');
            blade.classList.add('blade-dipping');
            setTimeout(() => {
                blade.classList.remove('blade-dipping');
                state.isDipped = true;
                state.canDragToolsAfterDip = true;
                state.lastAction = "dip";
                addLog("✅ 双面刀片已蘸水（可进行切割操作）");
                guide.innerText = "双面刀片已蘸水 → 可点击「切割」按钮进行切割";
            }, 1200);
        };
        showQuizModal(1);
    };

    btnCut.onclick = () => {
        if(state.isAnswering) return;
        state.pendingOperation = () => {
            if (state.step !== 3) {
                state.totalDeduction += 0.5;
                state.details.push("制作切片：未放置刀片就点击切割 (-0.5)");
                addLog("❌ 请先放置刀片！→ 扣0.5分");
                return;
            }
            if (!state.hasDish) {
                state.details.push("制作切片：未放置培养皿（内含清水）就点击切割");
                addLog("❌ 请先拖拽「培养皿（内含清水）」到操作台！");
                return;
            }
            if (!state.isDipped) {
                state.totalDeduction += 0.5;
                state.details.push("制作切片：切割前未蘸水（首次切割也需蘸水） (-0.5)");
                addLog("❌ 切割前必须先蘸水！→ 扣0.5分，请先点击「蘸水」按钮");
                return;
            }
            state.cutCount++;
            state.hasCut = true;
            state.canDragToolsAfterDip = false;
            state.lastAction = "cut";
            startCuttingAnimation();
            state.isDipped = false;
            document.getElementById('leaf-on-wood').classList.add('hidden');
            const cutLeafImg = document.getElementById('cut-leaf-img');
            if (cutLeafImg) cutLeafImg.classList.remove('hidden');
            addLog(`✅ 第${state.cutCount}次切割成功（已蘸水），叶片已替换为切割后图片`);
            guide.innerText = `第${state.cutCount}次切割完成 → 如需再次切割请重新「蘸水」-然后请独立完成后续制作切片操作`;
        };
        showQuizModal(2);
    };

    function startCuttingAnimation() {
        const bladesGroup = document.getElementById('blades-group');
        bladesGroup.classList.add('is-cutting');
        leafItem.classList.add('leaf-cut');
        setTimeout(() => {
            bladesGroup.classList.remove('is-cutting');
        }, 2000);
    }

    function playBrushAnimation() {
        const brush = document.getElementById('brush-tool');
        brush.classList.remove('hidden');
        addLog("✅ 用毛笔蘸取培养皿中最薄的切片");
    }

    function startGauzeWipeAnimation() {
        const gauze = document.getElementById('tool-gauze');
        const coverSlidePos = toolPositions['盖玻片'];
        const slidePos = toolPositions['载玻片'];
        gauze.classList.add('gauze-wiping');
        animateToolMove(gauze, coverSlidePos.x, coverSlidePos.y, 1000, () => {
            addLog("🧽 纱布擦拭盖玻片");
            animateToolMove(gauze, slidePos.x, slidePos.y, 1000, () => {
                addLog("🧽 纱布擦拭载玻片");
                gauze.classList.remove('gauze-wiping');
                setTimeout(() => {
                    gauze.classList.add('hidden');
                    addLog("✅ 纱布擦拭完成，已收起");
                }, 300);
            });
        });
    }

    function startWaterDropAnimation() {
        const water = document.getElementById('tool-water');
        const slidePos = toolPositions['载玻片'];
        water.classList.add('water-dropping');
        animateToolMove(water, slidePos.x, slidePos.y, 1200, () => {
            water.classList.remove('water-dropping');
            addLog("💧 清水滴加到载玻片上");
        });
    }

    function startBrushDipAnimation() {
        const brush = document.getElementById('brush-tool');
        const dish = document.getElementById('dip-water-dish');
        const waterTool = document.getElementById('tool-water');
        const dishRect = dish.getBoundingClientRect();
        const stageRect = document.getElementById('mainStage').getBoundingClientRect();
        const waterRect = waterTool.getBoundingClientRect();
        const dishCenterX = dishRect.left - stageRect.left + dishRect.width / 2 - brush.offsetWidth / 2 + 30;
        const dishCenterY = dishRect.top - stageRect.top + dishRect.height / 2 - brush.offsetHeight / 2;
        const waterCenterX = waterRect.left - stageRect.left + waterRect.width / 2 - brush.offsetWidth / 2 - 10 ;
        const waterCenterY = waterRect.top - stageRect.top + waterRect.height / 2 - brush.offsetHeight / 2 + 35 ;
        animateToolMove(brush, dishCenterX, dishCenterY, 1200, () => {
            brush.classList.add('brush-dipping');
            addLog("🖌️ 用毛笔蘸取培养皿中最薄的切片");
            setTimeout(() => {
                brush.classList.remove('brush-dipping');
                animateToolMove(brush, waterCenterX, waterCenterY, 1000, () => {
                    brush.classList.add('brush-dipping');
                    addLog("🖌️ 毛笔蘸取清水");
                    setTimeout(() => {
                        brush.classList.remove('brush-dipping');
                    }, 1000);
                });
            }, 1000);
        });
    }

    function startTweezersAnimation() {
        const forceps = document.getElementById('tool-forceps');
        const coverSlide = document.getElementById('tool-coverslide');
        const slide = document.getElementById('tool-slide');
        const water = document.getElementById('tool-water');
        const brush = document.getElementById('brush-tool');
        if (!forceps || !coverSlide || !slide || !water || !brush) {
            addLog("⚠️ 工具未加载完成，请稍后再试！");
            return;
        }
        const coverSlideRect = coverSlide.getBoundingClientRect();
        const slideRect = slide.getBoundingClientRect();
        const stageRect = document.getElementById('mainStage').getBoundingClientRect();
        const forcepsStartX = coverSlideRect.left - stageRect.left;
        const forcepsStartY = coverSlideRect.top - stageRect.top;
        const forcepsEndX = slideRect.left - stageRect.left;
        const forcepsEndY = slideRect.top - stageRect.top;
        animateToolMove(forceps, forcepsStartX, forcepsStartY, 1000, () => {
            addLog("🖐️ 镊子夹取盖玻片");
            setTimeout(() => {
                animateToolMove(forceps, forcepsEndX, forcepsEndY, 1000);
                animateToolMove(coverSlide, forcepsEndX, forcepsEndY, 1000, () => {
                    addLog("📌 镊子夹取盖玻片到载玻片上，形成切片");
                    coverSlide.style.zIndex = '1000';
                    forceps.classList.add('hidden');
                    water.classList.add('hidden');
                    brush.classList.add('hidden');
                });
            }, 500);
            state.step = 6;
            guide.innerText = "镊子操作完成 → 请拖入「显微镜」开始观察";
            document.getElementById('s-cut-step').innerText = "已完成切片制作 → 请放显微镜";
        });
    }

    function animateToolMove(element, targetX, targetY, duration, callback) {
        const startX = parseFloat(element.style.left.replace('px', '')) || toolPositions['纱布'].x;
        const startY = parseFloat(element.style.top.replace('px', '')) || toolPositions['纱布'].y;
        const startTime = performance.now();
        function moveStep(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentX = startX + (targetX - startX) * progress;
            const currentY = startY + (targetY - startY) * progress;
            element.style.left = `${currentX}px`;
            element.style.top = `${currentY}px`;
            if (progress < 1) {
                requestAnimationFrame(moveStep);
            } else {
                callback && callback();
            }
        }
        requestAnimationFrame(moveStep);
    }

    function initToolClickListeners() {
        const toolOrder = [
            { id: 'tool-gauze', name: '纱布', action: '擦拭', completed: false },
            { id: 'tool-water', name: '清水', action: '滴加', completed: false },
            { id: 'brush-tool', name: '毛笔', action: '蘸取切片', completed: false },
            { id: 'tool-forceps', name: '镊子', action: '夹取盖玻片', completed: false }
        ];
        state.toolStep = 0;
        const requiredTools = [
            { id: 'tool-slide', name: '载玻片' },
            { id: 'tool-forceps', name: '镊子' },
            { id: 'tool-gauze', name: '纱布' },
            { id: 'tool-coverslide', name: '盖玻片' },
            { id: 'brush-tool', name: '毛笔' },
            { id: 'tool-water', name: '清水' }
        ];
        function checkAllToolsValid() {
            const invalidTools = [];
            requiredTools.forEach(tool => {
                const isCompletedTool = toolOrder.some(item => item.id === tool.id && item.completed);
                if (isCompletedTool) return;
                const element = document.getElementById(tool.id);
                if (!element || element.classList.contains('hidden')) {
                    invalidTools.push(tool.name);
                }
            });
            if (invalidTools.length > 0) {
                return `❌ 请先将「${invalidTools.join('、')}」拖拽到操作台后，再进行操作！`;
            }
            return null;
        }
        function checkToolOrder(currentToolId) {
            const currentIndex = toolOrder.findIndex(item => item.id === currentToolId);
            if (currentIndex === -1) {
                return `❌ 无效操作：该工具无需按顺序操作！`;
            }
            if (toolOrder[currentIndex].completed) {
                const nextTool = toolOrder.find((item, idx) => idx === state.toolStep);
                return `❌ 「${toolOrder[currentIndex].name}」已操作完成，请勿重复点击！${nextTool ? `请继续点击「${nextTool.name}」完成${nextTool.action}。` : ''}`;
            }
            if (currentIndex > state.toolStep) {
                const nextTool = toolOrder[state.toolStep];
                return `❌ 操作顺序错误：请先点击「${nextTool.name}」完成${nextTool.action}后，再操作当前工具！`;
            }
            return null;
        }
        function markToolCompleted(toolId) {
            const toolItem = toolOrder.find(item => item.id === toolId);
            if (toolItem) {
                toolItem.completed = true;
            }
        }
        const gauze = document.getElementById('tool-gauze');
        const water = document.getElementById('tool-water');
        const brush = document.getElementById('brush-tool');
        const dish = document.getElementById('dip-water-dish'); 
        const waterTool = document.getElementById('tool-water'); 
        const forceps = document.getElementById('tool-forceps'); 

        gauze.style.pointerEvents = 'auto';
        gauze.addEventListener('click', () => {
            if(state.isAnswering) return;
            state.pendingOperation = () => {
                const checkMsg = checkAllToolsValid();
                if (checkMsg) {
                    addLog(checkMsg);
                    return;
                }
                const orderMsg = checkToolOrder('tool-gauze');
                if (orderMsg) {
                    addLog(orderMsg);
                    return;
                }
                startGauzeWipeAnimation();
                markToolCompleted('tool-gauze');
                state.toolStep++;
                addLog(`✅ 已完成「纱布」擦拭（纱布自动收起），下一步请点击「清水」进行滴加！`);
            };
            showQuizModal(4);
        });

        water.style.pointerEvents = 'auto';
        water.addEventListener('click', () => {
            if(state.isAnswering) return;
            state.pendingOperation = () => {
                const checkMsg = checkAllToolsValid();
                if (checkMsg) {
                    addLog(checkMsg);
                    return;
                }
                const orderMsg = checkToolOrder('tool-water');
                if (orderMsg) {
                    addLog(orderMsg);
                    return;
                }
                startWaterDropAnimation();
                markToolCompleted('tool-water');
                state.toolStep++;
                addLog(`✅ 已完成「清水」滴加，下一步请点击「毛笔」蘸取切片！`);
            };
            showQuizModal(4);
        });

        if (brush) {
            brush.style.pointerEvents = 'auto';
            brush.style.cursor = 'pointer';
            brush.addEventListener('click', () => {
                if(state.isAnswering) return;
                state.pendingOperation = () => {
                    const checkMsg = checkAllToolsValid();
                    if (checkMsg) {
                        addLog(checkMsg);
                        return;
                    }
                    const orderMsg = checkToolOrder('brush-tool');
                    if (orderMsg) {
                        addLog(orderMsg);
                        return;
                    }
                    if (!dish || dish.classList.contains('hidden')) {
                        addLog("❌ 请先放置培养皿（内含清水），再使用毛笔！");
                        return;
                    }
                    if (!waterTool || waterTool.classList.contains('hidden') && !toolOrder.find(item => item.id === 'tool-water').completed) {
                        addLog("❌ 请先放置清水工具，再使用毛笔！");
                        return;
                    }
                    startBrushDipAnimation();
                    markToolCompleted('brush-tool');
                    state.toolStep++;
                    addLog(`✅ 已完成「毛笔」蘸取切片，下一步请点击「镊子」夹取盖玻片！`);
                };
                showQuizModal(4);
            });
        }

        if (forceps) {
            forceps.style.pointerEvents = 'auto';
            forceps.style.cursor = 'pointer';
            forceps.addEventListener('click', () => {
                if(state.isAnswering) return;
                state.pendingOperation = () => {
                    const checkMsg = checkAllToolsValid();
                    if (checkMsg) {
                        addLog(checkMsg);
                        return;
                    }
                    const orderMsg = checkToolOrder('tool-forceps');
                    if (orderMsg) {
                        addLog(orderMsg);
                        return;
                    }
                    const coverSlide = document.getElementById('tool-coverslide');
                    const slide = document.getElementById('tool-slide');
                    if (!coverSlide || coverSlide.classList.contains('hidden')) {
                        addLog("❌ 请先放置盖玻片，再使用镊子！");
                        return;
                    }
                    if (!slide || slide.classList.contains('hidden')) {
                        addLog("❌ 请先放置载玻片，再使用镊子！");
                        return;
                    }
                    startTweezersAnimation();
                    markToolCompleted('tool-forceps');
                    state.toolStep++;
                    addLog(`🎉 已完成所有工具操作：纱布→清水→毛笔→镊子，顺序正确！`);
                };
                showQuizModal(4);
            });
        }
    }

    function initMicroscopeControls() {
        const btnCoarseFocus = document.getElementById('btnCoarseFocus');
        const btnFineFocus = document.getElementById('btnFineFocus');
        const btnRevolver = document.getElementById('btnRevolver');
        const btnMirror = document.getElementById('btnMirror');
        const btnSlidePlace = document.getElementById('btnSlidePlace');
        const microImage = document.getElementById('micro-image');
        btnFineFocus.disabled = state.isFineBtnDisabled;

        btnCoarseFocus.onclick = () => {
            if(state.isAnswering) return;
            state.pendingOperation = () => {
                if (state.microStep === 0) {
                    addLog("🔬 旋转粗准焦螺旋，使镜筒上升");
                    state.microStep = 1;
                    state.coarseFocusClickCount = 1;
                    state.isCoarseBtnDisabled = true;
                    btnCoarseFocus.disabled = true;
                    btnCoarseFocus.style.opacity = 0.1;
                } else if (state.microStep === 4 && state.coarseFocusClickCount === 1) {
                    addLog("🔬 旋转粗准焦螺旋，镜筒下降（眼睛注视物镜，避免压碎玻片）");
                    state.focusLevel--;
                    state.coarseFocusClickCount = 2;
                    state.microStep = 4.5;
                    const blurVal = Math.abs(5 - state.focusLevel) * 3;
                    microImage.style.filter = `blur(${blurVal}px)`;
                    state.isCoarseBtnDisabled = false;
                    btnCoarseFocus.disabled = false;
                    btnFineFocus.style.opacity = 0.3;
                } else if (state.microStep === 4.5 && state.coarseFocusClickCount === 2) {
                    addLog("🔬 旋转粗准焦螺旋，调整焦距寻找物像");
                    state.focusLevel--;
                    state.microStep = 5;
                    state.coarseFocusClickCount = 3;
                    const blurVal = Math.abs(5 - state.focusLevel) * 3;
                    microImage.style.filter = `blur(${blurVal}px)`;
                    state.isCoarseBtnDisabled = true;
                    btnCoarseFocus.disabled = true;
                    btnCoarseFocus.style.opacity = 0.1;
                    state.isFineBtnDisabled = false;
                    btnFineFocus.disabled = false;
                    btnFineFocus.style.opacity = 0.3;
                } else {
                    addLog("⚠️ 请按步骤操作：先完成转换器→反光镜→载玻片放置");
                }
            };
            showQuizModal(2);
        };

        btnFineFocus.onclick = () => {
            if(state.isAnswering) return;
            state.pendingOperation = () => {
                if (state.microStep === 5) {
                    addLog("🔬 调整细准焦螺旋，寻找清晰物像");
                    state.focusLevel++;
                    const blurVal = Math.abs(5 - state.focusLevel) * 3;
                    microImage.style.filter = `blur(${blurVal}px)`;
                    if (blurVal === 0) {
                        addLog("✨ 物像已清晰！可提交实验报告");
                        state.microStep = 6;
                        btnFineFocus.disabled = true;
                        btnFineFocus.style.opacity = 0.1;
                    } else if (Math.abs(state.focusLevel) > 8 && !state.hasFocusDeducted) {
                        state.totalDeduction += 0.5;
                        state.details.push("显微镜观察：调焦过度 (-0.5)");
                        state.hasFocusDeducted = true;
                        addLog("⚠️ 调焦过度 → 扣0.5分");
                    }
                } else {
                    addLog("⚠️ 请先完成粗准焦螺旋下降步骤");
                }
            };
            showQuizModal(2);
        };

        btnRevolver.onclick = () => {
            if(state.isAnswering) return;
            state.pendingOperation = () => {
                if (state.microStep === 1) {
                    addLog("🔬 转动转换器，低倍物镜对准通光孔");
                    state.microStep = 2;
                    state.isRevolverBtnDisabled = true;
                    btnRevolver.disabled = true;
                    btnRevolver.style.opacity = 0.1;
                } else {
                    addLog("⚠️ 请先旋转粗准焦螺旋使镜筒上升");
                }
            };
            showQuizModal(2);
        };

        btnMirror.onclick = () => {
            if(state.isAnswering) return;
            state.pendingOperation = () => {
                if (state.microStep === 2) {
                    addLog("🔬 调整反光镜，看到白亮圆形视野");
                    state.microStep = 3;
                    state.isMirrorBtnDisabled = true;
                    btnMirror.disabled = true;
                    btnMirror.style.opacity = 0.1;
                } else {
                    addLog("⚠️ 请先转动转换器对准低倍物镜");
                }
            };
            showQuizModal(2);
        };

        btnSlidePlace.onclick = () => {
            if(state.isAnswering) return;
            state.pendingOperation = () => {
                if (state.microStep === 3) {
                    addLog("🔬 载玻片放置在载物台");
                    state.microStep = 4;
                    state.isSlidePlaceBtnDisabled = true;
                    btnSlidePlace.disabled = true;
                    btnSlidePlace.style.opacity = 0.1;
                    document.getElementById('tool-slide').classList.add('hidden')
                    document.getElementById('tool-coverslide').classList.add('hidden')
                    state.isCoarseBtnDisabled = false;
                    btnCoarseFocus.disabled = false;
                    btnCoarseFocus.style.opacity = 0.3;
                } else {
                    addLog("⚠️ 请先调整反光镜看到白亮视野");
                }
            };
            showQuizModal(2);
        };
    }

    function initMicroscope() {
        document.getElementById('temp-slide-zone').classList.add('hidden');
        document.getElementById('micro-view').classList.remove('hidden');
        document.getElementById('eyepiece-circle').classList.remove('hidden');
        state.microStep = 0;
        state.coarseFocusClickCount = 0;
        state.isCoarseBtnDisabled = false;
        state.isFineBtnDisabled = true;
        state.isRevolverBtnDisabled = false;
        state.isMirrorBtnDisabled = false;
        state.isSlidePlaceBtnDisabled = false;
        const btnCoarseFocus = document.getElementById('btnCoarseFocus');
        const btnFineFocus = document.getElementById('btnFineFocus');
        const btnRevolver = document.getElementById('btnRevolver');
        const btnMirror = document.getElementById('btnMirror');
        const btnSlidePlace = document.getElementById('btnSlidePlace');
        btnCoarseFocus.disabled = false;
        btnCoarseFocus.style.opacity = 0.3;
        btnFineFocus.disabled = true;
        btnFineFocus.style.opacity = 0.1;
        btnRevolver.disabled = false;
        btnRevolver.style.opacity = 0.3;
        btnMirror.disabled = false;
        btnMirror.style.opacity = 0.3;
        btnSlidePlace.disabled = false;
        btnSlidePlace.style.opacity = 0.3;
        initMicroscopeControls();
    }

    document.getElementById('prepareBtn').onclick = () => {
          showCheckVideoModal(); 
        const modal = document.getElementById('equip-modal');
        const grid = document.getElementById('equipGrid');
        modal.style.display = 'flex';
        grid.innerHTML = '';
        const shuffledEquips = shuffleArray(allEquipsForCheck);
        shuffledEquips.forEach(name => {
            const item = document.createElement('label');
            item.className = 'equip-item';
            item.innerHTML = `<input type="checkbox" value="${name}"> ${name}`;
            grid.appendChild(item);
        });
    };
// ==========================
// 【清点器材专用视频】qingdian.mp4
// ==========================
function showCheckVideoModal() {
  let videoModal = document.getElementById('check-video-modal');
  if (videoModal) {
    videoModal.remove();
  }

  videoModal = document.createElement('div');
  videoModal.id = 'check-video-modal';
  videoModal.className = 'modal';
  videoModal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; width: 90%;">
      <h3>🎬 器材清点教学视频</h3>
      <div style="position: relative; padding-bottom: 56.25%; height: 0; margin:15px 0;">
        <video style="position:absolute; top:0; left:0; width:100%; height:100%; border-radius:8px;" controls>
          <source src="qingdian.mp4" type="video/mp4">
        </video>
      </div>
      <button id="close-check-video" class="btn-blue">关闭视频，开始清点</button>
    </div>
  `;
  document.body.appendChild(videoModal);
  videoModal.style.display = 'flex';

  document.getElementById('close-check-video').onclick = () => {
    videoModal.style.display = 'none';
      showQuizModal(1);
  };

}

// ==========================
// 【实验操作专用视频】caozuo.mp4
// ==========================
function showUseVideoModal() {
  let videoModal = document.getElementById('use-video-modal');
  if (videoModal) {
    videoModal.remove();
  }

  videoModal = document.createElement('div');
  videoModal.id = 'use-video-modal';
  videoModal.className = 'modal';
  videoModal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; width: 90%;">
      <h3>🎬 实验操作教学视频</h3>
      <div style="position: relative; padding-bottom: 56.25%; height: 0; margin:15px 0;">
        <video style="position:absolute; top:0; left:0; width:100%; height:100%; border-radius:8px;" controls>
         <source src="caozuo.mp4" type="video/mp4">
        </video>
      </div>
      <button id="close-use-video" class="btn-blue">关闭视频，开始实验</button>
    </div>
  `;
  document.body.appendChild(videoModal);
  videoModal.style.display = 'flex';

  document.getElementById('close-use-video').onclick = () => {
    videoModal.style.display = 'none';
       showQuizModal(1);
  };

}
    document.getElementById('submitEquip').onclick = () => {
        const checkedItems = Array.from(document.querySelectorAll('#equipGrid input:checked')).map(i => i.value);
        const selectedDistract = checkedItems.filter(v => distractEquips.includes(v));
        const missingRequired = requiredEquips.filter(v => !checkedItems.includes(v));
        let logMsg = "";
        if (selectedDistract.length > 0 && missingRequired.length > 0) {
            logMsg = `❌ 器材清点错误：多选了${selectedDistract.join('、')}，漏选了${missingRequired.join('、')} → 扣0.5分`;
            state.totalDeduction += 0.5;
            state.details.push(`清点器材：多选${selectedDistract.length}个干扰项/漏选${missingRequired.length}个必需项 (-0.5)`);
        } else if (selectedDistract.length > 0) {
            logMsg = `❌ 器材清点错误：多选了干扰项${selectedDistract.join('、')} → 扣0.5分`;
            state.totalDeduction += 0.5;
            state.details.push(`清点器材：多选${selectedDistract.length}个干扰项 (-0.5)`);
        } else if (missingRequired.length > 0) {
            logMsg = `❌ 器材清点错误：漏选了必需器材${missingRequired.join('、')} → 扣0.5分`;
            state.totalDeduction += 0.5;
            state.details.push(`清点器材：漏选${missingRequired.length}个必需项 (-0.5)`);
        } else {
            logMsg = "✅ 器材清点正确！已解锁实验操作";
             setTimeout(() => {
        showUseVideoModal(); 
    }, 500);
        }
        if (selectedDistract.length > 0 || missingRequired.length > 0) {
            state.prepared = false;
            document.getElementById('s-prepare').innerText = "❌ 清点错误，请重新清点";
        } else {
            state.prepared = true;
            document.getElementById('s-prepare').innerText = "✅ 清点正确（可开始拖拽操作）";
            initShelf(); 
            shelf.style.display = 'flex';
            guide.innerText = "请将「小木板」拖入实验区开始实验";
        }
        addLog(logMsg);
        document.getElementById('equip-modal').style.display = 'none';
    };

    document.getElementById('recordBtn').onclick = () => {
        const val = document.getElementById('reportInput').value.trim();
        const keywords = ['保护组织', '薄壁组织', '输导组织', '机械组织','制作叶片横切面临时切片','观察叶片横切面临时切片'];
        const pass = keywords.every(k => val.includes(k));
        if (pass) {
            addLog("✅ 实验报告正确（包含所有组织类型）");
        } else {
            state.totalDeduction += 0.5;
            state.details.push("实验报告：缺少组织类型描述 (-0.5)");
            addLog("❌ 实验报告不完整 → 扣0.5分");
        }
        document.getElementById('reportInput').disabled = true;
    };

    document.getElementById('tidyBtn').onclick = () => {
        const total = Math.max(0, 5 - state.totalDeduction);
        document.getElementById('finalScore').innerText = total.toFixed(1) + " 分";
        document.getElementById('scoreDetails').innerHTML = state.details.length > 0 ? 
            "扣分详情：<br>" + state.details.join('<br>') : "🎉 表现完美，满分！";
        document.getElementById('report-modal').style.display = 'flex';
    };

    function addLog(msg) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const time = new Date().toLocaleTimeString().slice(3, 8);
        entry.innerText = `[${time}] ${msg}`;
        logPanel.prepend(entry);
    }

    // 核心：随机出题 + 图片题支持
    function getRandomQuestions(category, n = RANDOM_QUESTION_COUNT) { 
        if (!questionBank[category]) {
            console.warn(`分类${category}不存在，默认使用分类1`);
            category = 1;
        }
        const categoryQuestions = JSON.parse(JSON.stringify(questionBank[category]));
        const shuffled = categoryQuestions.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(n, categoryQuestions.length));
    }

    // 弹窗弹题（操作前）
    function showQuizModal(category = 1) {
        state.currentQuestions = [];
        state.answeredCount = 0;
        state.isAnswering = true;
        state.currentQuestions = getRandomQuestions(category, RANDOM_QUESTION_COUNT);
        const modal = document.getElementById('quiz-modal');
        const content = document.getElementById('quiz-content');
        const remainEl = document.getElementById('quiz-remain');
        if (remainEl) {
            remainEl.innerText = state.currentQuestions.length - state.answeredCount;
        }
        renderQuestion(0);
        modal.style.display = 'flex';
    }

    // 渲染题目（支持图片题+点击放大）
    function renderQuestion(index) {
        if (index >= state.currentQuestions.length) return;
        const question = state.currentQuestions[index];
        const content = document.getElementById('quiz-content');
        let html = '';

        // 图片题
        if(question.type === 'image'){
            html = `
                <div style="margin-bottom:15px;"><strong>${index + 1}/${state.currentQuestions.length} ${question.title}</strong></div>
                <div style="text-align:center; margin-bottom:15px;">
                    <img src="${question.src}" style="max-width:100%; border-radius:8px; cursor:pointer;" 
                         onclick="window.open('${question.src}','_blank')" title="点击放大查看">
                </div>
                <div style="margin:10px 0;">
                    <input type="text" id="image-answer-input" placeholder="请输入答案" 
                           style="width:100%; padding:10px; font-size:16px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <button id="submit-image-answer" style="width:100%; padding:10px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;">
                    提交答案
                </button>
            `;
        } else {
            // 选择题
            html = `
                <div style="margin-bottom: 15px;"><strong>${index + 1}/${state.currentQuestions.length} ${question.title}</strong></div>
                <div id="options-list">
                    ${question.options.map((opt) => `
                        <div class="quiz-option" data-answer="${opt.charAt(0)}" style="margin: 8px 0; cursor: pointer; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            ${opt}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        content.innerHTML = html;
        document.getElementById('quiz-hint').style.display = 'none';
        document.getElementById('quiz-result').style.display = 'none';
        document.getElementById('quiz-close').style.display = 'none';

        // 选择题绑定
        if(!question.type){
            const options = document.querySelectorAll('.quiz-option');
            options.forEach(option => {
                option.addEventListener('click', () => {
                    const userAnswer = option.getAttribute('data-answer');
                    checkAnswer(index, userAnswer);
                });
            });
        } else {
            // 图片题提交绑定
            document.getElementById('submit-image-answer').addEventListener('click', () => {
                const input = document.getElementById('image-answer-input');
                const userAnswer = input.value.trim();
                checkAnswer(index, userAnswer);
            });
        }
    }

    // 答案校验
    function checkAnswer(questionIndex, userAnswer) {
        if (!state.currentQuestions[questionIndex]) {
            alert("⚠️ 题目数据异常，请重试！");
            document.getElementById('quiz-modal').style.display = 'none';
            state.isAnswering = false;
            return;
        }
        const question = state.currentQuestions[questionIndex];
        const hintEl = document.getElementById('quiz-hint');
        const resultEl = document.getElementById('quiz-result');
        const remainEl = document.getElementById('quiz-remain');
        const closeBtn = document.getElementById('quiz-close');
        const content = document.getElementById('quiz-content');

        if (userAnswer === question.answer) {
            state.answeredCount++;
            hintEl.style.display = 'none';
            resultEl.style.display = 'block';
            resultEl.innerText = `✅ 回答正确！剩余${state.currentQuestions.length - state.answeredCount}道题`;
            if (remainEl) remainEl.innerText = state.currentQuestions.length - state.answeredCount;

            setTimeout(() => {
                if (state.answeredCount >= state.currentQuestions.length) {
                    content.innerHTML = `<h4 style="text-align:center; color:#28a745;">🎉 所有${state.currentQuestions.length}道题回答正确！</h4>`;
                    resultEl.style.display = 'none';
                    closeBtn.style.display = 'block';
                    closeBtn.onclick = () => {
                        document.getElementById('quiz-modal').style.display = 'none';
                        state.isAnswering = false;
                        // 执行待执行的操作
                        if(state.pendingOperation){
                            state.pendingOperation();
                            state.pendingOperation = null;
                        }
                    };
                } else {
                    renderQuestion(questionIndex + 1);
                }
            }, 1000);
        } else {
            hintEl.style.display = 'block';
            hintEl.innerText = '❌ 答案错误，请重新选择！';
            hintEl.style.color = '#dc3545';
            hintEl.style.textAlign = 'center';
        }
    }

    restartBtn.onclick = () => {
        state.hasDish = false;
        document.getElementById('dip-water-dish').classList.add('hidden');
        window.location.reload();
    };
    closeReportBtn.onclick = () => document.getElementById('report-modal').style.display = 'none';
    shelf.style.display = 'none';
    initToolClickListeners();
});

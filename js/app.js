class ImageProcessorApp {
    constructor() {
        this.wasmProcessor = null;
        this.init().catch(err => {
            console.error("初始化失败:", err);
            document.getElementById("error").textContent = `初始化失败: ${err.message}`;
        });
    }

    async init() {
        // 1. 加载WASM模块
        const wasmModule = await import('../pkg/wasm_image_processor.js');
        await wasmModule.default('../pkg/wasm_image_processor_bg.wasm');
        
        // 2. 创建处理器实例
        this.wasmProcessor = new wasmModule.WasmImageProcessor();
        
        // 3. 初始化UI
        document.getElementById('fileInput').addEventListener('change', 
            (e) => this.processImage(e));
        
        console.log("WASM模块初始化完成");
    }

    async processImage(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // 准备UI
            const wasmCanvas = document.getElementById('wasmCanvas');
            const jsCanvas = document.getElementById('jsCanvas');
            const perfResult = document.getElementById('perfResult');
            
            // 清空之前的结果
            wasmCanvas.getContext('2d').clearRect(0, 0, wasmCanvas.width, wasmCanvas.height);
            jsCanvas.getContext('2d').clearRect(0, 0, jsCanvas.width, jsCanvas.height);
            perfResult.innerHTML = "<p>处理中...</p>";

            // 1. WASM处理
            const wasmStart = performance.now();
            
            // 读取文件
            const readStart = performance.now();
            const buffer = await file.arrayBuffer();
            const readTime = performance.now() - readStart;
            
            // WASM处理
            const decodeTime = await this.wasmProcessor.decode(new Uint8Array(buffer));
            const edgeDetectTime = await this.wasmProcessor.edge_detect();
            const renderTime = await this.wasmProcessor.render(wasmCanvas);
            
            const wasmTotal = performance.now() - wasmStart;
            
            // 2. JS处理对比
            const jsResult = await this.jsProcessImage(file, jsCanvas);
            
            // 3. 显示性能对比
            this.showPerformanceResults({
                readTime,
                decodeTime,
                edgeDetectTime,
                renderTime,
                wasmTotal,
                jsGrayTime: jsResult.grayTime,
                jsEdgeTime: jsResult.edgeTime,
                jsTotal: jsResult.totalTime
            });
            
        } catch (err) {
            console.error("处理失败:", err);
            document.getElementById("error").textContent = `处理失败: ${err.message}`;
        }
    }

    async jsProcessImage(file, canvas) {
        const start = performance.now();
        
        // 1. 加载图片
        const img = await createImageBitmap(file);
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // 2. 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 3. 灰度化
        const grayStart = performance.now();
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
            data[i] = data[i+1] = data[i+2] = gray;
        }
        const grayTime = performance.now() - grayStart;
        
        // 4. Sobel边缘检测
        const edgeStart = performance.now();
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < canvas.height-1; y++) {
            for (let x = 1; x < canvas.width-1; x++) {
                const idx = (y * canvas.width + x) * 4;
                
                let gx = 0, gy = 0;
                for (let ky = 0; ky < 3; ky++) {
                    for (let kx = 0; kx < 3; kx++) {
                        const px = x + kx - 1;
                        const py = y + ky - 1;
                        const pIdx = (py * canvas.width + px) * 4;
                        const gray = tempData[pIdx];
                        
                        gx += gray * SOBEL_X[ky][kx];
                        gy += gray * SOBEL_Y[ky][kx];
                    }
                }
                
                const magnitude = Math.min(255, Math.sqrt(gx*gx + gy*gy));
                data[idx] = data[idx+1] = data[idx+2] = magnitude;
            }
        }
        const edgeTime = performance.now() - edgeStart;
        
        // 5. 渲染结果
        ctx.putImageData(imageData, 0, 0);
        const totalTime = performance.now() - start;
        
        return { grayTime, edgeTime, totalTime };
    }

    showPerformanceResults(results) {
        const perfHTML = `
        <div class="performance-results">
            <h3>性能对比结果</h3>
            <table>
                <thead>
                    <tr>
                        <th>处理阶段</th>
                        <th>WASM 耗时 (ms)</th>
                        <th>JS 耗时 (ms)</th>
                        <th>性能提升</th>
                        <th>提升幅度</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>文件读取</td>
                        <td>${results.readTime.toFixed(2)}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>图片解码</td>
                        <td>${results.decodeTime.toFixed(2)}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>灰度化</td>
                        <td>(包含在边缘检测)</td>
                        <td>${results.jsGrayTime.toFixed(2)}</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>边缘检测</td>
                        <td>${results.edgeDetectTime.toFixed(2)}</td>
                        <td>${results.jsEdgeTime.toFixed(2)}</td>
                        <td>${(results.jsEdgeTime - results.edgeDetectTime).toFixed(2)}</td>
                        <td class="improvement">${((results.jsEdgeTime - results.edgeDetectTime)/results.jsEdgeTime*100).toFixed(0)}% ↑</td>
                    </tr>
                    <tr>
                        <td>Canvas渲染</td>
                        <td>${results.renderTime.toFixed(2)}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>总耗时</strong></td>
                        <td><strong>${results.wasmTotal.toFixed(2)}</strong></td>
                        <td><strong>${results.jsTotal.toFixed(2)}</strong></td>
                        <td><strong>${(results.jsTotal - results.wasmTotal).toFixed(2)}</strong></td>
                        <td class="improvement"><strong>${((results.jsTotal - results.wasmTotal)/results.jsTotal*100).toFixed(0)}% ↑</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;
        
        document.getElementById('perfResult').innerHTML = perfHTML;
    }
}

// Sobel算子
const SOBEL_X = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
];
const SOBEL_Y = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
];

// 启动应用
new ImageProcessorApp();
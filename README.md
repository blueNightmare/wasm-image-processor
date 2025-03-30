# WASM vs JS 图像处理性能对比项目  

## 项目简介  
对比 WebAssembly (WASM) 和 JavaScript 在图像处理（解码、灰度化、边缘检测）上的性能差异，提供可视化结果和详细性能指标。  

---

## 技术栈  
| 模块          | 技术                 |
|---------------|----------------------|
| **前端**      | HTML5, CSS3, JavaScript |
| **WASM**      | Rust (wasm-bindgen)  |
| **构建工具**  | wasm-pack            |
| **图像处理**  | Rust `image` crate   |

---

## 运行步骤  

### 前置要求  
1. **Node.js** ([下载链接](https://nodejs.org/))  
2. **Rust** (安装命令: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)  
3. **wasm-pack**:  
   ```bash
   cargo install wasm-pack
   ````
4. **构建 WASM 模块**
    ```bash
    cd wasm-image-processor  
    wasm-pack build --target web  # 生成在 `pkg/` 目录
    ````
5. **启动 HTTP 服务器**
    ```bash
    npm install -g http-server  
    http-server
    ````
    默认访问地址: http://localhost:8080

6. **使用流程**
上传图片（支持 JPG/PNG 等）

项目结构
```plaintext
.
├── pkg/                    # WASM 构建产物  
├── src/
│   └── lib.rs              # Rust 图像处理逻辑  
├── js/
│   └── app.js              # JS 实现与性能对比  
├── index.html              # 前端界面  
└── README.md               # 说明文档  
````
注意事项
⚠️ 必须通过 HTTP 服务器运行（如 http-server），直接打开本地文件会因 CORS 限制失败。
⚠️ 首次加载 WASM 需要编译，可能有短暂延迟。
⚠️ 大图片处理耗时较长，建议测试使用 1000x1000 像素以内的图片。

扩展建议
修改算法：编辑 lib.rs 中的 edge_detect 或 sobel_magnitude 方法

调整 UI：修改 index.html 中的布局或 app.js 的性能展示逻辑

添加新功能：如支持更多滤镜（高斯模糊、锐化等）
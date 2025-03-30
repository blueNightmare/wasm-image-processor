use wasm_bindgen::prelude::*;
use image::{GenericImageView, ImageBuffer};
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};
use console_error_panic_hook;

// 初始化panic hook
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct WasmImageProcessor {
    width: u32,
    height: u32,
    pixels: Vec<u8>,
}

#[wasm_bindgen]
impl WasmImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        // 双重保障设置panic hook
        console_error_panic_hook::set_once();
        Self {
            width: 0,
            height: 0,
            pixels: Vec::new(),
        }
    }

    #[wasm_bindgen]
    pub fn decode(&mut self, buffer: &[u8]) -> Result<f64, JsValue> {
        let start = js_sys::Date::now();
        let img = image::load_from_memory(buffer)
            .map_err(|e| JsValue::from_str(&format!("解码失败: {}", e)))?;

        let (width, height) = img.dimensions();
        let pixels = img.to_rgba8().into_raw();

        self.width = width;
        self.height = height;
        self.pixels = pixels;

        Ok(js_sys::Date::now() - start)
    }

    #[wasm_bindgen]
    pub fn edge_detect(&mut self) -> f64 {
        let start = js_sys::Date::now();
        let mut new_pixels = vec![0; (self.width * self.height * 4) as usize];
        
        // Sobel边缘检测
        for y in 1..self.height-1 {
            for x in 1..self.width-1 {
                let idx = (y * self.width + x) as usize * 4;
                let gray = self.get_gray(x, y);
                let magnitude = self.sobel_magnitude(x, y);
                
                new_pixels[idx] = magnitude;
                new_pixels[idx+1] = magnitude;
                new_pixels[idx+2] = magnitude;
                new_pixels[idx+3] = 255;
            }
        }

        self.pixels = new_pixels;
        js_sys::Date::now() - start
    }

    #[wasm_bindgen]
    pub fn render(&self, canvas: &HtmlCanvasElement) -> Result<f64, JsValue> {
        let start = js_sys::Date::now();
        canvas.set_width(self.width);
        canvas.set_height(self.height);
        
        let ctx = canvas
            .get_context("2d")?
            .unwrap()
            .dyn_into::<CanvasRenderingContext2d>()?;

        let image_data = web_sys::ImageData::new_with_u8_clamped_array(
            wasm_bindgen::Clamped(&self.pixels),
            self.width,
        )?;

        ctx.put_image_data(&image_data, 0.0, 0.0)?;
        Ok(js_sys::Date::now() - start)
    }

    #[wasm_bindgen]
    pub fn get_dimensions(&self) -> Vec<u32> {
        vec![self.width, self.height]
    }

    // 辅助方法
    fn get_gray(&self, x: u32, y: u32) -> u8 {
        let idx = (y * self.width + x) as usize * 4;
        let r = self.pixels[idx] as f32;
        let g = self.pixels[idx+1] as f32;
        let b = self.pixels[idx+2] as f32;
        (0.299 * r + 0.587 * g + 0.114 * b) as u8
    }

    fn sobel_magnitude(&self, x: u32, y: u32) -> u8 {
        let mut gx = 0.0;
        let mut gy = 0.0;
        
        for ky in 0..3 {
            for kx in 0..3 {
                let px = x + kx - 1;
                let py = y + ky - 1;
                let gray = self.get_gray(px, py) as f32;
                
                gx += gray * SOBEL_X[ky as usize][kx as usize];
                gy += gray * SOBEL_Y[ky as usize][kx as usize];
            }
        }
        
        (gx * gx + gy * gy).sqrt().min(255.0) as u8
    }
}

const SOBEL_X: [[f32; 3]; 3] = [
    [-1.0, 0.0, 1.0],
    [-2.0, 0.0, 2.0],
    [-1.0, 0.0, 1.0]
];

const SOBEL_Y: [[f32; 3]; 3] = [
    [-1.0, -2.0, -1.0],
    [0.0, 0.0, 0.0],
    [1.0, 2.0, 1.0]
];

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}
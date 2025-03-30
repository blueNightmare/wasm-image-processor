use wasm_bindgen::prelude::*;

// 设置更好的panic错误提示
pub fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
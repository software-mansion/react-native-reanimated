use napi_derive::napi;

mod autoworkletization;
mod bundle_mode;
mod class_method;
mod closure;
mod file_directive;
mod gesture_handler_autoworkletization;
mod imports;
mod layout_animation_autoworkletization;
mod naming;
mod options;
mod plugin;
mod program;
mod referenced_worklets;
mod types;
mod utils;
mod worklet_factory;
mod worklet_pass;
mod worklet_string_code;

pub use options::PluginOptions;
use program::run;

#[napi(object)]
pub struct EmittedFile {
    pub path: String,
    pub content: String,
}

#[napi(object)]
pub struct TransformResult {
    pub code: String,
    pub map: Option<String>,
    pub files: Vec<EmittedFile>,
    pub changed: bool,
}

#[napi]
pub fn transform(
    source_text: String,
    filename: String,
    options: Option<PluginOptions>,
) -> napi::Result<TransformResult> {
    // TODO: Check if this is actually needed on windows
    let filename = filename.replace('\\', "/");
    let mut opts = options.unwrap_or_default();
    if let Some(dir) = opts.worklets_package_dir.take() {
        opts.worklets_package_dir = Some(dir.replace('\\', "/"));
    }
    let result = std::panic::catch_unwind(|| run(&source_text, &filename, opts));
    match result {
        Ok(Ok(value)) => Ok(value),
        Ok(Err(msg)) => Err(napi::Error::from_reason(format!(
            "[Worklets] Babel plugin exception: {msg}"
        ))),
        Err(payload) => {
            let msg = panic_payload_to_string(payload);
            Err(napi::Error::from_reason(format!(
                "[Worklets] Babel plugin exception (panic): {msg} (file: {filename})"
            )))
        }
    }
}

fn panic_payload_to_string(payload: Box<dyn std::any::Any + Send>) -> String {
    if let Some(s) = payload.downcast_ref::<&'static str>() {
        return (*s).to_string();
    }
    if let Some(s) = payload.downcast_ref::<String>() {
        return s.clone();
    }
    "unknown panic".to_string()
}

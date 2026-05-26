use std::collections::HashSet;

use crate::globals::default_globals;
use crate::options::PluginOptions;

#[derive(Debug)]
pub struct State {
    pub opts: PluginOptions,

    pub worklet_number: u32,

    pub globals: HashSet<String>,

    pub workletizable_modules: HashSet<String>,

    pub file_workletization: bool,

    pub bundle_mode_active: bool,

    /// Files the bundle-mode worklet pass wants to emit alongside the
    /// transformed source. `(path, content)` pairs.
    pub emitted_files: Vec<(String, String)>,

    /// The full source text of the file being transformed, used to populate
    /// `sources_content` in `__initData.sourceMap` so consumers don't need to
    /// read the file from disk at runtime.
    pub source_text: String,

    /// Depth of enclosing-worklet recursion. While > 0 we are walking inside
    /// a function body that is itself going to be serialized as a worklet —
    /// autoworkletization of hook callbacks (`runOnUISync(<fn>)`, etc.) is
    /// suppressed because those callbacks will run in worklet context anyway.
    /// Matches babel-plugin-worklets' inner-traversal pattern (only explicit
    /// `'worklet'`-directive functions get workletized below an outer worklet).
    pub inside_worklet_depth: u32,
}

impl State {
    pub fn new(opts: PluginOptions) -> Self {
        let strict_global = opts.strict_global.unwrap_or(false);
        let globals = if strict_global {
            HashSet::new()
        } else {
            let mut g = default_globals();
            if let Some(extra) = &opts.globals {
                for name in extra {
                    g.insert(name.clone());
                }
            }
            g
        };

        let workletizable_modules: HashSet<String> = opts
            .workletizable_modules
            .as_deref()
            .unwrap_or(&[])
            .iter()
            .cloned()
            .collect();

        let bundle_mode_active = opts.bundle_mode.unwrap_or(false);

        Self {
            opts,
            worklet_number: 1,
            globals,
            workletizable_modules,
            file_workletization: false,
            bundle_mode_active,
            emitted_files: Vec::new(),
            source_text: String::new(),
            inside_worklet_depth: 0,
        }
    }

    pub fn next_worklet_number(&mut self) -> u32 {
        let n = self.worklet_number;
        self.worklet_number += 1;
        n
    }
}

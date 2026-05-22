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
        }
    }

    pub fn next_worklet_number(&mut self) -> u32 {
        let n = self.worklet_number;
        self.worklet_number += 1;
        n
    }
}

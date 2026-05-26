use std::collections::{HashMap, HashSet};

use oxc_syntax::symbol::SymbolId;

use crate::globals::default_globals;
use crate::options::PluginOptions;

/// Shape of an import binding so we can re-emit it in a bundle-mode
/// `.worklets/<hash>.js` file.
#[derive(Debug, Clone)]
pub enum ImportShape {
    /// `import foo from 'x'`
    Default,
    /// `import { foo as local } from 'x'` — `imported` is the original name
    /// in the module, `local` is what we capture as. `imported == local`
    /// when not aliased.
    Named { imported: String },
    /// `import * as foo from 'x'`
    Namespace,
}

#[derive(Debug, Clone)]
pub struct ImportInfo {
    /// `"react-native-worklets"` etc.
    pub source: String,
    /// Local-binding name (what the worklet body references).
    pub local: String,
    pub shape: ImportShape,
}

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

    /// Index from `SymbolId` of an import binding to its module shape.
    /// Built once at file entry by scanning top-level `ImportDeclaration`s.
    /// Used by bundle-mode emission to re-export imports into each
    /// `.worklets/<hash>.js` file so worklet bodies that reference them
    /// resolve at module-eval time.
    pub imports_by_symbol: HashMap<SymbolId, ImportInfo>,
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
            imports_by_symbol: HashMap::new(),
        }
    }

    pub fn next_worklet_number(&mut self) -> u32 {
        let n = self.worklet_number;
        self.worklet_number += 1;
        n
    }
}

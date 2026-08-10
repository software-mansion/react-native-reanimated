use std::collections::{HashMap, HashSet};

use oxc_syntax::symbol::SymbolId;

use crate::globals::default_globals;
use crate::options::PluginOptions;

const DEFAULT_FORWARDABLE_MODULE_NAMES: &[&str] = &[
    "react-native-worklets",
    "react-native/Libraries/Core/setUpXHR",
];

const DEFAULT_FORWARDABLE_RELATIVE_PATHS: &[&str] = &["react-native-worklets"];

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

    /// Module names whose imports are forwarded into emitted worklet files,
    /// defaults included.
    pub forwardable_module_names: Vec<String>,

    /// Path fragments marking a source file as allowed to forward its own
    /// relative imports, defaults included.
    pub forwardable_relative_paths: Vec<String>,

    /// Full original source text. The worklet-body codegen builds mini-programs
    /// containing cloned AST nodes whose spans still index into the original
    /// file. oxc_codegen's source-map builder asserts `span.end <= source_text
    /// .len()` (and otherwise emits wrong tokens in release), so the mini-
    /// program must be initialised with this string, not `""`.
    pub source_text: String,

    /// Files the bundle-mode worklet pass wants to emit alongside the
    /// transformed source. `(path, content)` pairs.
    pub emitted_files: Vec<(String, String)>,

    /// Index from `SymbolId` of an import binding to its module shape.
    /// Built once at file entry by scanning top-level `ImportDeclaration`s.
    /// Used by bundle-mode emission to re-export imports into each
    /// `.worklets/<hash>.js` file so worklet bodies that reference them
    /// resolve at module-eval time.
    pub imports_by_symbol: HashMap<SymbolId, ImportInfo>,

    /// Names already used for `_worklet_<hash>_init_data` top-level decls in
    /// this file. Two worklets with identical body strings produce identical
    /// hashes — without this guard they'd both mint the same identifier and
    /// the codegen would emit a `const` re-declaration. We append `_2`, `_3`,
    /// … on collision, mirroring Babel's `scope.generateUidIdentifier`.
    pub seen_init_data_ids: HashSet<String>,

    /// Symbol IDs of top-level declarations passed (by identifier reference)
    /// as an auto-workletizable argument somewhere in the file. The worklet
    /// pass uses this to retroactively inject the `'worklet'` directive on
    /// referenced declarations so plain `const f = () => {...}; useAnimatedStyle(f);`
    /// gets workletized. Mirrors `referencedWorklets.ts`.
    pub referenced_worklet_symbols: HashSet<SymbolId>,
}

impl State {
    pub fn new(opts: PluginOptions, source_text: String) -> Self {
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

        let user_forwarding = opts.import_forwarding.clone().unwrap_or_default();
        let mut forwardable_module_names: Vec<String> = DEFAULT_FORWARDABLE_MODULE_NAMES
            .iter()
            .map(|s| (*s).to_string())
            .collect();
        forwardable_module_names
            .extend(user_forwarding.module_names.unwrap_or_default());
        let mut forwardable_relative_paths: Vec<String> = DEFAULT_FORWARDABLE_RELATIVE_PATHS
            .iter()
            .map(|s| (*s).to_string())
            .collect();
        forwardable_relative_paths
            .extend(user_forwarding.relative_paths.unwrap_or_default());

        Self {
            opts,
            worklet_number: 1,
            globals,
            forwardable_module_names,
            forwardable_relative_paths,
            source_text,
            emitted_files: Vec::new(),
            imports_by_symbol: HashMap::new(),
            seen_init_data_ids: HashSet::new(),
            referenced_worklet_symbols: HashSet::new(),
        }
    }

    pub fn next_worklet_number(&mut self) -> u32 {
        let n = self.worklet_number;
        self.worklet_number += 1;
        n
    }

    /// Reserve a `_worklet_<hash>_init_data` identifier, suffixing `_2`/`_3`/…
    /// when the same base has already been used in this file.
    pub fn reserve_init_data_id(&mut self, base: &str) -> String {
        if self.seen_init_data_ids.insert(base.to_string()) {
            return base.to_string();
        }
        let mut n: u32 = 2;
        loop {
            let candidate = format!("{base}_{n}");
            if self.seen_init_data_ids.insert(candidate.clone()) {
                return candidate;
            }
            n += 1;
        }
    }
}

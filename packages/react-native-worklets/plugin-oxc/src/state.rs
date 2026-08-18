use std::collections::HashMap;

use oxc_semantic::Scoping;
use oxc_syntax::symbol::SymbolId;

use crate::options::PluginOptions;

const DEFAULT_FORWARDABLE_MODULE_NAMES: &[&str] = &[
    "react-native-worklets",
    "react-native/Libraries/Core/setUpXHR",
];

const DEFAULT_FORWARDABLE_RELATIVE_PATHS: &[&str] = &["react-native-worklets"];

#[derive(Debug, Clone)]
pub enum ImportShape {
    Default,
    Named { imported: String },
    Namespace,
}

#[derive(Debug, Clone)]
pub struct ImportInfo {
    pub source: String,
    pub local: String,
    pub shape: ImportShape,
}

#[derive(Debug)]
pub struct State {
    pub opts: PluginOptions,

    pub worklet_number: u32,

    pub forwardable_module_names: Vec<String>,

    pub forwardable_relative_paths: Vec<String>,

    pub source_text: String,

    pub emitted_files: Vec<(String, String)>,

    pub imports_by_symbol: HashMap<SymbolId, ImportInfo>,

    pub hidden_writes: HashMap<SymbolId, usize>,

    pub error: Option<String>,
}

pub fn binding_is_rebound(
    scoping: &Scoping,
    hidden_writes: &HashMap<SymbolId, usize>,
    symbol_id: SymbolId,
) -> bool {
    if !scoping.symbol_redeclarations(symbol_id).is_empty() {
        return true;
    }
    let writes = scoping
        .get_resolved_references(symbol_id)
        .filter(|reference| reference.is_write())
        .count();
    writes > hidden_writes.get(&symbol_id).copied().unwrap_or(0)
}

impl State {
    pub fn new(opts: PluginOptions, source_text: String) -> Self {
        let user_forwarding = opts.import_forwarding.clone().unwrap_or_default();
        let mut forwardable_module_names: Vec<String> = DEFAULT_FORWARDABLE_MODULE_NAMES
            .iter()
            .map(|s| (*s).to_string())
            .collect();
        forwardable_module_names.extend(user_forwarding.module_names.unwrap_or_default());
        let mut forwardable_relative_paths: Vec<String> = DEFAULT_FORWARDABLE_RELATIVE_PATHS
            .iter()
            .map(|s| (*s).to_string())
            .collect();
        forwardable_relative_paths.extend(user_forwarding.relative_paths.unwrap_or_default());

        Self {
            opts,
            worklet_number: 1,
            forwardable_module_names,
            forwardable_relative_paths,
            source_text,
            emitted_files: Vec::new(),
            imports_by_symbol: HashMap::new(),
            hidden_writes: HashMap::new(),
            error: None,
        }
    }

    pub fn next_worklet_number(&mut self) -> u32 {
        let n = self.worklet_number;
        self.worklet_number += 1;
        n
    }
}
